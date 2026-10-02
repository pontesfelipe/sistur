import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Polícia Federal / MTur — chegadas de turistas internacionais por UF.
 * Fonte oficial: dados.turismo.gov.br (CKAN, dataset "chegada-de-turistas-internacionais").
 * Formato oficial (Latin-1, ;): Via_de_acesso;UF;nome_pais_correto;mes;ano;Chegadas
 *   UF = nome do estado, mes = nome do mês. Agregamos por UF+mês+via (+ TOTAL), somando países.
 * Por padrão lê os 2 arquivos mais recentes do dataset; PF_ARRIVALS_CSV_URL sobrescreve (um URL).
 */
const DATASET_API = 'https://dados.turismo.gov.br/api/3/action/package_show?id=chegada-de-turistas-internacionais';

const UF: Record<string, string> = {
  'acre':'AC','alagoas':'AL','amapa':'AP','amazonas':'AM','bahia':'BA','ceara':'CE','distrito federal':'DF',
  'espirito santo':'ES','goias':'GO','maranhao':'MA','mato grosso':'MT','mato grosso do sul':'MS','minas gerais':'MG',
  'para':'PA','paraiba':'PB','parana':'PR','pernambuco':'PE','piaui':'PI','rio de janeiro':'RJ','rio grande do norte':'RN',
  'rio grande do sul':'RS','rondonia':'RO','roraima':'RR','santa catarina':'SC','sao paulo':'SP','sergipe':'SE','tocantins':'TO',
};
const MES: Record<string, number> = {
  janeiro:1,fevereiro:2,marco:3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12,
};
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const VIA: Record<string, string> = { aerea:'AEREA', terrestre:'TERRESTRE', maritima:'MARITIMA', fluvial:'FLUVIAL' };

async function resolveUrls(): Promise<string[]> {
  const override = Deno.env.get('PF_ARRIVALS_CSV_URL');
  if (override) return [override];
  const r = await fetch(DATASET_API, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`dados.turismo.gov.br HTTP ${r.status}`);
  const d = await r.json();
  const csvs = (d?.result?.resources ?? [])
    .filter((x: any) => String(x.format).toUpperCase() === 'CSV' && /chegadas/i.test(x.url))
    .map((x: any) => x.url as string);
  return csvs.slice(-2);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const authResult = await requireAdminOrServiceRole(req);
  if (authResult instanceof Response) return authResult;
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const urls = await resolveUrls();
    if (!urls.length) return json({ success: true, status: 'skipped_no_source', message: 'PF: nenhum arquivo encontrado.', processed: 0 });

    const agg = new Map<string, { uf: string; y: number; m: number; via: string; n: number }>();
    const add = (uf: string, y: number, m: number, via: string, n: number) => {
      const k = `${uf}|${y}|${m}|${via}`;
      const cur = agg.get(k);
      if (cur) cur.n += n; else agg.set(k, { uf, y, m, via, n });
    };

    for (const url of urls) {
      const resp = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!resp.ok) throw new Error(`PF CSV HTTP ${resp.status} (${url})`);
      const buf = new Uint8Array(await resp.arrayBuffer());
      let text = new TextDecoder('utf-8').decode(buf);
      if (text.includes('\uFFFD')) text = new TextDecoder('latin1').decode(buf);
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const header = lines[0].split(';').map(norm);
      const official = header.includes('via_de_acesso');
      for (const line of lines.slice(1)) {
        const c = line.split(';').map((s) => s.trim());
        let uf: string | undefined, y: number, m: number | undefined, via: string, n: number;
        if (official) {
          uf = UF[norm(c[1] ?? '')]; m = MES[norm(c[3] ?? '')]; y = parseInt(c[4], 10);
          via = VIA[norm(c[0] ?? '')] ?? 'OUTRA'; n = parseInt((c[5] ?? '').replace(/\./g, ''), 10);
        } else {
          // formato simplificado: uf;ano;mes;via;chegadas
          uf = (c[0] ?? '').toUpperCase(); y = parseInt(c[1], 10); m = parseInt(c[2], 10);
          via = (c[3] || 'AEREA').toUpperCase(); n = parseInt((c[4] ?? '').replace(/\./g, ''), 10);
        }
        if (!uf || uf.length !== 2 || !y || !m || !Number.isFinite(n)) continue;
        add(uf, y, m, via, n);
        add(uf, y, m, 'TOTAL', n);
      }
    }

    const now = new Date().toISOString();
    const rows = [...agg.values()].map((a) => ({
      uf: a.uf, reference_year: a.y, reference_month: a.m, via: a.via, arrivals: a.n, updated_at: now,
    }));
    let processed = 0, failed = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from('pf_international_arrivals')
        .upsert(chunk, { onConflict: 'uf,reference_year,reference_month,via' });
      if (error) { console.error('[PF] upsert:', error.message); failed += chunk.length; } else processed += chunk.length;
    }
    return json({ success: true, message: `PF: ${processed} registros (UF×mês×via) importados de ${urls.length} arquivo(s).`, processed, failed, sources: urls });
  } catch (e) {
    console.error('[PF] Fatal:', e);
    return json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
