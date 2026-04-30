// CADÚNICO monthly ingestion job
//
// Pulls aggregated municipal Cadastro Único stats from the SAGI/MDS public Solr
// API ("Matriz de Informações Sociais"). For every Brazilian municipality we
// keep ONE row in `cadunico_municipio_cache` with the most recent month that
// has populated CADÚNICO counts. Designed to be invoked once per month by
// pg_cron. The Solr endpoint accepts CSV output, so we stream + parse it
// line-by-line to keep memory low.
//
// Source: https://aplicacoes.mds.gov.br/sagi/servicos/misocial
// (Public, no API key required.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLR_BASE = "https://aplicacoes.mds.gov.br/sagi/servicos/misocial";

// Fields we want, mapped to friendly aliases.
const FIELDS = [
  "ibge:codigo_ibge",
  "muni:municipio",
  "uf:sigla_uf",
  "anomes:anomes_s",
  "fam_cad:cadun_qtd_familias_cadastradas_i",
  "pes_cad:cadun_qtd_pessoas_cadastradas_i",
  "fam_baixa:cadun_qtd_familias_cadastradas_baixa_renda_i",
  "pes_baixa:cadun_qtd_pessoas_cadastradas_baixa_renda_i",
  "fam_extrema:cadun_qtd_fam_sit_extrema_pobreza_s",
  "pop:populacao_censo_2022_i",
].join(",");

function parseCSVLine(line: string, sep = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function streamCSV(url: string, onLine: (cols: string[]) => void): Promise<{ totalBytes: number; rowsRead: number }> {
  const resp = await fetch(url, { headers: { "User-Agent": "SISTUR/1.0 (ingest-cadunico)" } });
  if (!resp.ok || !resp.body) throw new Error(`Failed to fetch ${url}: HTTP ${resp.status}`);
  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let totalBytes = 0;
  let rowsRead = 0;
  let header: string[] | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const raw = buffer.slice(0, nl).replace(/\r$/, "");
      buffer = buffer.slice(nl + 1);
      if (!raw) continue;
      const cols = parseCSVLine(raw, ",");
      if (!header) { header = cols; continue; }
      onLine(cols);
      rowsRead++;
    }
  }
  if (buffer.trim()) {
    const cols = parseCSVLine(buffer, ",");
    if (header) { onLine(cols); rowsRead++; }
  }
  return { totalBytes, rowsRead };
}

function intOrNull(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: run } = await supabase
    .from("cadunico_ingestion_runs")
    .insert({ source_url: SOLR_BASE, status: "running" })
    .select().single();
  const runId = run?.id;
  const finishRun = async (patch: Record<string, unknown>) => {
    if (!runId) return;
    await supabase.from("cadunico_ingestion_runs")
      .update({ ...patch, finished_at: new Date().toISOString() }).eq("id", runId);
  };

  const work = (async () => {
    try {
      // 1) Discover the most recent month that actually has populated CADÚNICO data.
      //    We probe a sample municipality (Foz do Iguaçu = 410830) and walk the
      //    Solr facet for anomes_s desc filtered by cadun_qtd_familias_cadastradas_i:[1 TO *].
      const probeUrl = `${SOLR_BASE}?q=*:*&fq=cadun_qtd_familias_cadastradas_i:%5B1+TO+*%5D&fl=anomes_s&rows=1&sort=anomes_s+desc&wt=json`;
      const probeResp = await fetch(probeUrl);
      if (!probeResp.ok) throw new Error(`probe failed: HTTP ${probeResp.status}`);
      const probeJson = await probeResp.json();
      const refAnomes: string | undefined = probeJson?.response?.docs?.[0]?.anomes_s;
      if (!refAnomes) throw new Error("could not detect latest anomes from SAGI");
      console.log(`[ingest-cadunico] reference anomes = ${refAnomes}`);

      // 2) Pull all municipalities for that anomes as CSV (one row per município).
      const params = new URLSearchParams({
        q: "*:*",
        wt: "csv",
        omitHeader: "false",
        rows: "10000000",
        sort: "codigo_ibge asc",
        fl: FIELDS,
      });
      params.append("fq", `anomes_s:${refAnomes}`);
      params.append("fq", "cadun_qtd_familias_cadastradas_i:[1 TO *]");
      const csvUrl = `${SOLR_BASE}?${params.toString()}`;
      console.log(`[ingest-cadunico] downloading: ${csvUrl}`);

      // Solr CSV header order matches the FIELDS aliases.
      // Aliases order: ibge, muni, uf, anomes, fam_cad, pes_cad, fam_baixa, pes_baixa, fam_extrema, pop
      const rows: any[] = [];
      const refYear = parseInt(refAnomes.slice(0, 4), 10);
      const refMonth = parseInt(refAnomes.slice(4, 6), 10);

      const { totalBytes, rowsRead } = await streamCSV(csvUrl, (cols) => {
        if (cols.length < 10) return;
        const ibge6 = (cols[0] || "").trim();
        if (!/^\d{6}$/.test(ibge6)) return;
        const muni = (cols[1] || "").trim().replace(/^"|"$/g, "");
        const uf = (cols[2] || "").trim();
        const fam_cad = intOrNull(cols[4]);
        const pes_cad = intOrNull(cols[5]);
        const fam_baixa = intOrNull(cols[6]);
        const pes_baixa = intOrNull(cols[7]);
        const fam_extrema = intOrNull(cols[8]);
        const pop = intOrNull(cols[9]);
        const pct = (pes_baixa != null && pop && pop > 0)
          ? Math.round((pes_baixa / pop) * 10000) / 100
          : null;
        rows.push({
          ibge_code_6: ibge6,
          ibge_code_7: null, // optional — caller can join via destinations table
          municipio: muni,
          uf,
          anomes: refAnomes,
          reference_year: refYear,
          reference_month: refMonth,
          total_familias_cadastradas: fam_cad,
          total_pessoas_cadastradas: pes_cad,
          familias_baixa_renda: fam_baixa,
          pessoas_baixa_renda: pes_baixa,
          familias_extrema_pobreza: fam_extrema,
          populacao_referencia: pop,
          pct_pop_baixa_renda: pct,
          data_source_url: csvUrl,
          fetched_at: new Date().toISOString(),
        });
      });

      console.log(`[ingest-cadunico] parsed ${rows.length} municípios (${(totalBytes / 1e6).toFixed(2)} MB)`);

      // 3) Upsert in batches.
      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        const { error } = await supabase
          .from("cadunico_municipio_cache")
          .upsert(slice, { onConflict: "ibge_code_6" });
        if (error) throw new Error(`upsert batch ${i}: ${error.message}`);
      }

      await finishRun({
        status: "success",
        reference_anomes: refAnomes,
        rows_processed: rowsRead,
        municipalities_updated: rows.length,
        bytes_downloaded: totalBytes,
      });
      console.log(`[ingest-cadunico] SUCCESS — ${rows.length} municípios atualizados (anomes ${refAnomes})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ingest-cadunico] FAILED:", msg);
      await finishRun({ status: "error", error_message: msg });
    }
  })();

  // @ts-ignore EdgeRuntime is provided by Deno deploy
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
  else work.catch(() => {});

  return new Response(
    JSON.stringify({ success: true, run_id: runId, message: "CADÚNICO ingestion started in background" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});