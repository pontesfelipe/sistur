// ANAC monthly ingestion job
// Downloads the official 353MB CSV (Dados_Estatisticos.csv) via streaming,
// aggregates by municipality (last 12 months), and upserts results into
// public.anac_air_connectivity. Designed to be invoked once per month by
// pg_cron. Streaming + line-by-line parsing keeps memory footprint low.
//
// Source: https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/Dados%20Estat%C3%ADsticos%20do%20Transporte%20A%C3%A9reo/Dados_Estatisticos.csv
// Aerodrome → IBGE map: https://siros.anac.gov.br/siros/registros/aerodromo/aerodromos.csv

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANAC_STATS_URL =
  "https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/Dados%20Estat%C3%ADsticos%20do%20Transporte%20A%C3%A9reo/Dados_Estatisticos.csv";
const AERODROMOS_URL =
  "https://siros.anac.gov.br/siros/registros/aerodromo/aerodromos.csv";

interface MunAgg {
  ibge_code: string;
  municipality_name: string;
  uf: string;
  airports: Set<string>;
  total_flights: number;
  domestic_flights: number;
  international_flights: number;
  total_passengers: number;
  domestic_passengers: number;
  international_passengers: number;
}

function parseCSVLine(line: string, sep = ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ""));
}

async function streamCSVLines(
  url: string,
  onLine: (line: string, lineNo: number) => void,
  onProgress?: (bytes: number) => void,
): Promise<{ totalBytes: number }> {
  const resp = await fetch(url, { headers: { "User-Agent": "SISTUR/1.0 (ingest-anac)" } });
  if (!resp.ok || !resp.body) {
    throw new Error(`Failed to fetch ${url}: HTTP ${resp.status}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder("latin1");
  let buffer = "";
  let lineNo = 0;
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).replace(/\r$/, "");
      buffer = buffer.slice(nl + 1);
      onLine(line, lineNo++);
    }
    if (onProgress && lineNo % 50000 === 0) onProgress(totalBytes);
  }
  if (buffer.length > 0) onLine(buffer, lineNo++);
  return { totalBytes };
}

function parseCoord(v: string): number { return parseFloat((v || "").replace(",", ".")); }

// ICAO → aeroporto brasileiro com coordenadas (aerodromos.csv, sem código IBGE)
async function loadAerodromeMap(): Promise<Map<string, { iata: string; name: string; municipality: string; uf: string; lat: number; lon: number }>> {
  const map = new Map();
  let first = true;
  await streamCSVLines(AERODROMOS_URL, (raw) => {
    if (first) { first = false; return; }
    const c = parseCSVLine(raw.replace(/^\uFEFF/, ""), ";");
    if (c.length < 9 || c[5] !== "BRASIL") return;
    const lat = parseCoord(c[7]), lon = parseCoord(c[8]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    map.set(c[0].toUpperCase(), { iata: c[1], name: c[2], municipality: c[3], uf: c[4], lat, lon });
  });
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authResult = await requireAdminOrServiceRole(req);
  if (authResult instanceof Response) return authResult;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Create run log row
  const { data: run } = await supabase
    .from("anac_ingestion_runs")
    .insert({ source_url: ANAC_STATS_URL, status: "running" })
    .select()
    .single();
  const runId = run?.id;

  const finishRun = async (patch: Record<string, unknown>) => {
    if (!runId) return;
    await supabase
      .from("anac_ingestion_runs")
      .update({ ...patch, finished_at: new Date().toISOString() })
      .eq("id", runId);
  };

  // Use background task so we can return immediately to caller
  const work = (async () => {
    try {
      console.log("[ingest-anac] Loading aerodrome map...");
      const icaoMap = await loadAerodromeMap();
      console.log(`[ingest-anac] Loaded ${icaoMap.size} aerodromes`);

      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      const cutoffKey = cutoff.getFullYear() * 100 + cutoff.getMonth() + 1;
      const agg = new Map<string, { dep: number; pax: number; intl: number }>();
      let header: string[] | null = null;
      let iYear = -1, iMonth = -1, iOrig = -1, iDep = -1, iPax = -1, iNat = -1, iGrp = -1;
      let rowsProcessed = 0, totalBytes = 0;
      await streamCSVLines(ANAC_STATS_URL, (raw) => {
        if (!header) {
          if (!raw.includes("ANO") || !raw.includes("DECOLAGENS")) return; // pula "Atualizado em"
          header = parseCSVLine(raw.replace(/^\uFEFF/, ""), ";");
          iYear = header.indexOf("ANO"); iMonth = header.indexOf("MES");
          iOrig = header.indexOf("AEROPORTO_DE_ORIGEM_SIGLA"); iDep = header.indexOf("DECOLAGENS");
          iPax = header.indexOf("PASSAGEIROS_PAGOS"); iNat = header.indexOf("NATUREZA"); iGrp = header.indexOf("GRUPO_DE_VOO");
          return;
        }
        // filtro rápido por ano antes de parsear a linha toda
        const m = raw.match(/;"(\d{4})";"(\d{1,2})";/);
        if (!m || Number(m[1]) * 100 + Number(m[2]) < cutoffKey) return;
        rowsProcessed++;
        const c = parseCSVLine(raw, ";");
        if (c[iGrp] === "IMPRODUTIVO") return;
        const icao = (c[iOrig] || "").toUpperCase();
        if (!icaoMap.has(icao)) return;
        const dep = parseInt(c[iDep] || "0", 10) || 0;
        const pax = parseInt(c[iPax] || "0", 10) || 0;
        const e = agg.get(icao) || { dep: 0, pax: 0, intl: 0 };
        e.dep += dep; e.pax += pax; if ((c[iNat] || "").includes("INTERNACIONAL")) e.intl += dep;
        agg.set(icao, e);
      }, (bytes) => { totalBytes = bytes; });

      const periodStart = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-01`;
      const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const rows = Array.from(agg.entries()).filter(([, e]) => e.dep > 0).map(([icao, e]) => {
        const a = icaoMap.get(icao)!;
        return { icao, iata: a.iata, name: a.name, municipality: a.municipality, uf: a.uf, latitude: a.lat, longitude: a.lon,
          departures_12m: e.dep, passengers_12m: e.pax, international_departures_12m: e.intl,
          reference_period_start: periodStart, reference_period_end: periodEnd, fetched_at: new Date().toISOString() };
      });
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("anac_airports").upsert(rows.slice(i, i + 500), { onConflict: "icao" });
        if (error) throw new Error(`upsert batch ${i}: ${error.message}`);
      }
      await finishRun({
        status: "success",
        rows_processed: rowsProcessed,
        municipalities_updated: rows.length,
        bytes_downloaded: totalBytes,
      });
      console.log(`[ingest-anac] SUCCESS — ${rows.length} municípios atualizados`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ingest-anac] FAILED:", msg);
      await finishRun({ status: "error", error_message: msg });
    }
  })();

  // Background task — return immediately
  // @ts-ignore EdgeRuntime is provided by Deno deploy
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
  else work.catch(() => {});

  return new Response(
    JSON.stringify({ success: true, run_id: runId, message: "ANAC ingestion started in background" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});