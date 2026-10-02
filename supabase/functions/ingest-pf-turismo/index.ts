import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Polícia Federal / MTur — chegadas de turistas internacionais por UF.
 * Dados abertos publicados em planilha; lê CSV via secret PF_ARRIVALS_CSV_URL.
 * Formato (;): uf;ano;mes;via;chegadas   (via: AEREA|TERRESTRE|MARITIMA|FLUVIAL|TOTAL)
 * Sem URL → skipped_no_source.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const authResult = await requireAdminOrServiceRole(req);
  if (authResult instanceof Response) return authResult;
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const csvUrl = Deno.env.get('PF_ARRIVALS_CSV_URL');
    if (!csvUrl) {
      return json({ success: true, status: 'skipped_no_source', message: 'PF: fonte CSV não configurada (PF_ARRIVALS_CSV_URL).', processed: 0 });
    }
    const resp = await fetch(csvUrl, { signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`PF CSV HTTP ${resp.status}`);
    const lines = (await resp.text()).split(/\r?\n/).filter((l) => l.trim());

    const rows: Record<string, unknown>[] = [];
    for (const line of lines.slice(1)) {
      const [uf, ano, mes, via, chegadas] = line.split(';').map((s) => s.trim());
      const y = parseInt(ano, 10), m = parseInt(mes, 10);
      if (!uf || uf.length !== 2 || !y || !(m >= 1 && m <= 12)) continue;
      const n = parseInt((chegadas ?? '').replace(/\./g, ''), 10);
      rows.push({
        uf: uf.toUpperCase(), reference_year: y, reference_month: m,
        via: (via || 'TOTAL').toUpperCase(),
        arrivals: Number.isFinite(n) ? n : null,
        updated_at: new Date().toISOString(),
      });
      if (rows.length >= 20000) break;
    }

    let processed = 0, failed = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from('pf_international_arrivals')
        .upsert(chunk, { onConflict: 'uf,reference_year,reference_month,via' });
      if (error) { console.error('[PF] upsert:', error.message); failed += chunk.length; } else processed += chunk.length;
    }
    return json({ success: true, message: `PF: ${processed} registros importados.`, processed, failed });
  } catch (e) {
    console.error('[PF] Fatal:', e);
    return json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
