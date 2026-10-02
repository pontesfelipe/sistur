import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SNIS/SINISA — saneamento básico por município.
 * Sem API REST pública estável; lê CSV agregado configurável via secret SNIS_CSV_URL.
 * Formato (separador ;):
 *   ibge_code;ano;agua_pct;esgoto_coleta_pct;esgoto_tratamento_pct;residuos_pct;perdas_pct
 * Sem URL → status skipped_no_source (não falha).
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
    let body: any = {};
    try { body = await req.json(); } catch { /* ok */ }
    const filterIbge: string | undefined = body.ibge_code;

    const csvUrl = Deno.env.get('SNIS_CSV_URL');
    if (!csvUrl) {
      return json({ success: true, status: 'skipped_no_source', message: 'SNIS: fonte CSV não configurada (SNIS_CSV_URL).', processed: 0 });
    }

    const resp = await fetch(csvUrl, { signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`SNIS CSV HTTP ${resp.status}`);
    const lines = (await resp.text()).split(/\r?\n/).filter((l) => l.trim());

    const rows: Record<string, unknown>[] = [];
    for (const line of lines.slice(1)) {
      const [ibge, ano, agua, ec, et, res, perdas] = line.split(';').map((s) => s.trim());
      if (!ibge || !ano) continue;
      if (filterIbge && ibge !== filterIbge) continue;
      rows.push({
        ibge_code: ibge,
        reference_year: parseInt(ano, 10),
        agua_cobertura_pct: num(agua),
        esgoto_coleta_pct: num(ec),
        esgoto_tratamento_pct: num(et),
        residuos_coleta_pct: num(res),
        perdas_agua_pct: num(perdas),
        updated_at: new Date().toISOString(),
      });
      if (rows.length >= 10000) break;
    }

    let processed = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('snis_sanitation_indicators')
        .upsert(rows.slice(i, i + 500), { onConflict: 'ibge_code,reference_year' });
      if (error) console.error('[SNIS] upsert:', error.message); else processed += Math.min(500, rows.length - i);
    }
    return json({ success: true, message: `SNIS: ${processed} registros importados.`, processed });
  } catch (e) {
    console.error('[SNIS] Fatal:', e);
    return json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
