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
    const seen = new Map<string, { asset_type: string | null; prot: Set<string>; status: string | null }>();
    const add = (ibge: string, nome: string, tipo?: string | null, prot?: string | null, sit?: string | null) => {
      if (!/^\d{7}$/.test(ibge || '') || !nome) return;
      if (filterIbge && ibge !== filterIbge) return;
      const key = `${ibge}|${nome.slice(0, 500)}`;
      const cur = seen.get(key);
      if (cur) { if (prot) cur.prot.add(prot.toLowerCase()); return; }
      seen.set(key, { asset_type: tipo?.toLowerCase() || null, prot: new Set(prot ? [prot.toLowerCase()] : []), status: sit || null });
    };
    if (csvUrl) {
      const resp = await fetch(csvUrl, { signal: AbortSignal.timeout(60000) });
      if (!resp.ok) throw new Error(`IPHAN CSV HTTP ${resp.status}`);
      for (const line of (await resp.text()).split(/\r?\n/).slice(1)) {
        const [ibge, nome, tipo, protecao, situacao] = line.split(';').map((s) => s.trim());
        add(ibge, nome, tipo, protecao, situacao);
      }
    } else {
      // Geoserver público do IPHAN (SICG:Bem_Protecao). co_iphan = UF + código IBGE (7 dígitos) + ...
      const url = 'https://geoserver.iphan.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature'
        + '&typeName=SICG:Bem_Protecao&outputFormat=application/json'
        + '&propertyName=identificacao_bem,co_iphan,ds_natureza,ds_tipo_protecao,ds_condicao_protecao';
      const resp = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!resp.ok) throw new Error(`IPHAN WFS HTTP ${resp.status}`);
      const geo = await resp.json();
      for (const f of geo.features ?? []) {
        const p = f.properties ?? {};
        add(String(p.co_iphan ?? '').slice(2, 9), String(p.identificacao_bem ?? '').trim(), p.ds_natureza, p.ds_tipo_protecao, p.ds_condicao_protecao);
      }
    }
    const rows = [...seen.entries()].map(([k, v]) => {
      const [ibge_code, asset_name] = k.split('|');
      return { ibge_code, asset_name, asset_type: v.asset_type, protection_level: [...v.prot].sort().join('; ') || null, status: v.status };
    });

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
