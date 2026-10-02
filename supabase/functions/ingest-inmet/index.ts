import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * INMET — Normais Climatológicas do Brasil 1991-2020.
 * Lê direto as planilhas oficiais (uma por variável) em portal.inmet.gov.br/uploads/normais.
 * Layout: linha "Código | Nome da Estação | UF | Janeiro..Dezembro | Ano"; "-" = sem dado.
 */
const BASE = 'https://portal.inmet.gov.br/uploads/normais/Normal-Climatologica-';
const VARS: Record<string, string> = {
  TMEDSECA: 'temp_media_c', TMAX: 'temp_max_c', TMIN: 'temp_min_c', PREC: 'precipitacao_mm',
};

const num = (v: unknown) => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const authResult = await requireAdminOrServiceRole(req);
  if (authResult instanceof Response) return authResult;
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const rows = new Map<string, Record<string, unknown>>();
    const now = new Date().toISOString();
    let failedFiles = 0;

    for (const [code, col] of Object.entries(VARS)) {
      const resp = await fetch(`${BASE}${code}.xlsx`, {
        headers: { 'User-Agent': 'Mozilla/5.0 SISTUR' }, signal: AbortSignal.timeout(60000),
      });
      if (!resp.ok) { console.error(`[INMET] ${code} HTTP ${resp.status}`); failedFiles++; continue; }
      const wb = XLSX.read(new Uint8Array(await resp.arrayBuffer()), { type: 'array' });
      const data: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
      const h = data.findIndex((r) => String(r?.[0] ?? '').trim().startsWith('Código'));
      if (h < 0) { failedFiles++; continue; }
      for (const r of data.slice(h + 1)) {
        const st = String(r?.[0] ?? '').trim();
        if (!/^\d+$/.test(st)) continue;
        for (let m = 1; m <= 12; m++) {
          const key = `${st}|${m}`;
          let row = rows.get(key);
          if (!row) {
            row = { station_code: st, station_name: String(r[1] ?? '').trim() || null,
              uf: String(r[2] ?? '').trim().toUpperCase() || null, month: m, period: '1991-2020', updated_at: now };
            rows.set(key, row);
          }
          row[col] = num(r[2 + m]);
        }
      }
    }

    const all = [...rows.values()];
    let processed = 0, failed = 0;
    for (let i = 0; i < all.length; i += 500) {
      const chunk = all.slice(i, i + 500);
      const { error } = await supabase.from('inmet_climate_normals')
        .upsert(chunk, { onConflict: 'station_code,month,period' });
      if (error) { console.error('[INMET] upsert:', error.message); failed += chunk.length; } else processed += chunk.length;
    }
    return json({ success: true, message: `INMET: ${processed} registros (estação×mês) importados.`, processed, failed: failed + failedFiles });
  } catch (e) {
    console.error('[INMET] Fatal:', e);
    return json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
