import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * IPHAN/SICG — bens do patrimônio cultural por município.
 * Lê CSV configurável via secret IPHAN_CSV_URL. Formato (separador ;):
 *   ibge_code;nome;tipo;protecao;situacao
 * tipo ex.: material/imaterial/arqueologico; protecao ex.: tombado/registrado/valorado.
 * Sem URL → status skipped_no_source (não falha).
 */

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

    const csvUrl = Deno.env.get('IPHAN_CSV_URL');
    if (!csvUrl) {
      return json({ success: true, status: 'skipped_no_source', message: 'IPHAN: fonte CSV não configurada (IPHAN_CSV_URL).', processed: 0 });
    }

    const resp = await fetch(csvUrl, { signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`IPHAN CSV HTTP ${resp.status}`);
    const lines = (await resp.text()).split(/\r?\n/).filter((l) => l.trim());

    const seen = new Set<string>();
    const rows: Record<string, unknown>[] = [];
    for (const line of lines.slice(1)) {
      const [ibge, nome, tipo, protecao, situacao] = line.split(';').map((s) => s.trim());
      if (!ibge || !nome) continue;
      if (filterIbge && ibge !== filterIbge) continue;
      const key = `${ibge}|${nome}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        ibge_code: ibge,
        asset_name: nome.slice(0, 500),
        asset_type: tipo?.toLowerCase() || null,
        protection_level: protecao?.toLowerCase() || null,
        status: situacao || null,
      });
      if (rows.length >= 20000) break;
    }

    let processed = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('iphan_heritage_assets')
        .upsert(rows.slice(i, i + 500), { onConflict: 'ibge_code,asset_name' });
      if (error) console.error('[IPHAN] upsert:', error.message); else processed += Math.min(500, rows.length - i);
    }
    return json({ success: true, message: `IPHAN: ${processed} bens importados.`, processed });
  } catch (e) {
    console.error('[IPHAN] Fatal:', e);
    return json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
