import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * INMET — Normais Climatológicas (1991-2020) por estação.
 * Lê CSV agregado via secret INMET_NORMALS_CSV_URL.
 * Formato (;): station_code;ibge_code;uf;mes;temp_media;temp_max;temp_min;precipitacao_mm
 * Sem URL → skipped_no_source.
 */
const num = (v?: string) => {
  if (!v) return null;
  const n = parseFloat(v.replace(',', '.'));
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
    const csvUrl = Deno.env.get('INMET_NORMALS_CSV_URL');
    if (!csvUrl) {
      return json({ success: true, status: 'skipped_no_source', message: 'INMET: fonte CSV não configurada (INMET_NORMALS_CSV_URL).', processed: 0 });
    }
    const resp = await fetch(csvUrl, { signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`INMET CSV HTTP ${resp.status}`);
    const lines = (await resp.text()).split(/\r?\n/).filter((l) => l.trim());

    const rows: Record<string, unknown>[] = [];
    for (const line of lines.slice(1)) {
      const [st, ibge, uf, mes, tmed, tmax, tmin, prec] = line.split(';').map((s) => s.trim());
      const m = parseInt(mes, 10);
      if (!st || !(m >= 1 && m <= 12)) continue;
      rows.push({
        station_code: st, ibge_code: ibge || null, uf: uf ? uf.toUpperCase() : null, month: m,
        temp_media_c: num(tmed), temp_max_c: num(tmax), temp_min_c: num(tmin), precipitacao_mm: num(prec),
        period: '1991-2020', updated_at: new Date().toISOString(),
      });
      if (rows.length >= 20000) break;
    }

    let processed = 0, failed = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from('inmet_climate_normals')
        .upsert(chunk, { onConflict: 'station_code,month,period' });
      if (error) { console.error('[INMET] upsert:', error.message); failed += chunk.length; } else processed += chunk.length;
    }
    return json({ success: true, message: `INMET: ${processed} registros importados.`, processed, failed });
  } catch (e) {
    console.error('[INMET] Fatal:', e);
    return json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
