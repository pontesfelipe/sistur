// ANAC monthly ingestion job
// Downloads the official 353MB CSV (Dados_Estatisticos.csv) via streaming,
// aggregates by municipality (last 12 months), and upserts results into
// public.anac_air_connectivity. Designed to be invoked once per month by
// pg_cron. Streaming + line-by-line parsing keeps memory footprint low.
//
// Source: https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/Dados%20Estat%C3%ADsticos%20do%20Transporte%20A%C3%A9reo/Dados_Estatisticos.csv
// Aerodrome → IBGE map: https://siros.anac.gov.br/siros/registros/aerodromo/aerodromos.csv

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

// Build ICAO → {ibge, name, uf} map from the small aerodromes CSV
async function loadAerodromeMap(): Promise<Map<string, { ibge: string; name: string; uf: string }>> {
  const map = new Map<string, { ibge: string; name: string; uf: string }>();
  let header: string[] | null = null;
  let icaoIdx = -1, ibgeIdx = -1, munIdx = -1, ufIdx = -1;
  await streamCSVLines(AERODROMOS_URL, (raw) => {
    if (!raw.trim()) return;
    const cols = parseCSVLine(raw, ";");
    if (!header) {
      header = cols.map((h) => h.toLowerCase());
      icaoIdx = header.findIndex((h) => h.includes("cod") && (h.includes("oaci") || h.includes("icao")));
      ibgeIdx = header.findIndex((h) => h.includes("ibge"));
      munIdx = header.findIndex((h) => h.includes("munic"));
      ufIdx = header.findIndex((h) => h === "uf" || h.includes("estado") || h.includes("sigla_uf"));
      if (icaoIdx < 0 || ibgeIdx < 0) {
        // Fallback common headers
        icaoIdx = icaoIdx >= 0 ? icaoIdx : header.findIndex((h) => h.includes("oaci"));
      }
      return;
    }
    const icao = (cols[icaoIdx] || "").toUpperCase().trim();
    const ibge = (cols[ibgeIdx] || "").trim();
    if (!icao || !ibge) return;
    map.set(icao, {
      ibge: ibge.length === 7 ? ibge : ibge.padStart(7, "0"),
      name: munIdx >= 0 ? cols[munIdx] : "",
      uf: ufIdx >= 0 ? cols[ufIdx] : "",
    });
  });
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

      // Determine cutoff: last 12 months
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      const cutoffYear = cutoff.getFullYear();
      const cutoffMonth = cutoff.getMonth() + 1;

      const agg = new Map<string, MunAgg>();
      let header: string[] | null = null;
      let idxAirport = -1, idxYear = -1, idxMonth = -1;
      let idxFlights = -1, idxPax = -1, idxNature = -1;
      let rowsProcessed = 0;
      let totalBytes = 0;

      await streamCSVLines(
        ANAC_STATS_URL,
        (raw) => {
          if (!raw.trim()) return;
          const cols = parseCSVLine(raw, ";");
          if (!header) {
            header = cols.map((h) => h.toLowerCase());
            // Heuristic header detection — ANAC schema may evolve
            idxAirport = header.findIndex((h) =>
              h.includes("aeroporto") && (h.includes("origem") || h.includes("partida") || h.includes("oaci"))
            );
            if (idxAirport < 0) idxAirport = header.findIndex((h) => h.includes("oaci"));
            idxYear = header.findIndex((h) => h.includes("ano"));
            idxMonth = header.findIndex((h) => h.includes("mes"));
            idxFlights = header.findIndex((h) => h.includes("decolagens") || h.includes("voo"));
            idxPax = header.findIndex((h) => h.includes("passageiros") && h.includes("pagos"));
            if (idxPax < 0) idxPax = header.findIndex((h) => h.includes("passageiros"));
            idxNature = header.findIndex((h) => h.includes("natureza") || h.includes("grupo"));
            return;
          }
          rowsProcessed++;
          const year = parseInt(cols[idxYear] || "0", 10);
          const month = parseInt(cols[idxMonth] || "0", 10);
          if (!year || !month) return;
          // Filter last 12 months
          if (year < cutoffYear || (year === cutoffYear && month < cutoffMonth)) return;

          const icao = (cols[idxAirport] || "").toUpperCase().trim();
          if (!icao) return;
          const aero = icaoMap.get(icao);
          if (!aero) return;

          const flights = parseInt(cols[idxFlights] || "0", 10) || 0;
          const pax = parseInt(cols[idxPax] || "0", 10) || 0;
          const nature = (cols[idxNature] || "").toUpperCase();
          const isIntl = nature.includes("INTERNACIONAL");

          let entry = agg.get(aero.ibge);
          if (!entry) {
            entry = {
              ibge_code: aero.ibge,
              municipality_name: aero.name,
              uf: aero.uf,
              airports: new Set(),
              total_flights: 0,
              domestic_flights: 0,
              international_flights: 0,
              total_passengers: 0,
              domestic_passengers: 0,
              international_passengers: 0,
            };
            agg.set(aero.ibge, entry);
          }
          entry.airports.add(icao);
          entry.total_flights += flights;
          entry.total_passengers += pax;
          if (isIntl) {
            entry.international_flights += flights;
            entry.international_passengers += pax;
          } else {
            entry.domestic_flights += flights;
            entry.domestic_passengers += pax;
          }
        },
        (bytes) => {
          totalBytes = bytes;
          if (rowsProcessed % 200000 === 0) {
            console.log(`[ingest-anac] ${rowsProcessed} rows | ${(bytes / 1e6).toFixed(1)} MB | ${agg.size} municípios`);
          }
        },
      );

      console.log(`[ingest-anac] Done parsing. ${rowsProcessed} rows, ${agg.size} municípios`);

      // Upsert in batches
      const periodStart = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-01`;
      const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const rows = Array.from(agg.values()).map((e) => ({
        ibge_code: e.ibge_code,
        municipality_name: e.municipality_name,
        uf: e.uf,
        airport_icao_codes: Array.from(e.airports),
        airport_count: e.airports.size,
        total_flights_12m: e.total_flights,
        domestic_flights_12m: e.domestic_flights,
        international_flights_12m: e.international_flights,
        total_passengers_12m: e.total_passengers,
        domestic_passengers_12m: e.domestic_passengers,
        international_passengers_12m: e.international_passengers,
        reference_period_start: periodStart,
        reference_period_end: periodEnd,
        data_source_url: ANAC_STATS_URL,
        fetched_at: new Date().toISOString(),
      }));

      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        const { error } = await supabase
          .from("anac_air_connectivity")
          .upsert(slice, { onConflict: "ibge_code" });
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