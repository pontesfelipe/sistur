// Edge function: ingest-tse
// Calcula comparecimento eleitoral por município usando dados abertos do TSE.
// Indicador: MST_TSE_TURNOUT (Mandala da Sustentabilidade no Turismo).
//
// Fonte primária: https://dadosabertos.tse.jus.br/dataset/resultados-{ano}
// Como o dataset oficial é massivo (CSV gigante), expomos um endpoint que aceita
// um valor pré-calculado (input manual + auditoria) e/ou um override por município.
//
// Para o MVP, a função aceita ibge_code + ano (opcional) e retorna o último
// percentual conhecido a partir de uma tabela curada `tse_turnout_cache` que o
// admin pode popular periodicamente. Se não houver cache, retorna null com
// instrução para coleta manual.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  ibge_code: string;
  year?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.ibge_code) {
      return new Response(
        JSON.stringify({ error: 'ibge_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Best-effort: try a curated cache table if available.
    // The table can be created by the admin to mirror TSE bulk extracts.
    let value: number | null = null;
    let referenceYear: number | null = body.year ?? null;
    let source = 'TSE — dadosabertos.tse.jus.br';
    let note: string | null = null;

    try {
      const { data: cached } = await supabase
        .from('tse_turnout_cache' as any)
        .select('turnout_pct, election_year')
        .eq('ibge_code', body.ibge_code)
        .order('election_year', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        value = Number((cached as any).turnout_pct);
        referenceYear = Number((cached as any).election_year);
      }
    } catch (_e) {
      // Cache table doesn't exist yet — fallback to manual.
      note = 'Cache TSE indisponível. Colete manualmente via tse.jus.br/eleicoes/estatisticas.';
    }

    if (value === null) {
      return new Response(
        JSON.stringify({
          indicator_code: 'MST_TSE_TURNOUT',
          value: null,
          reference_year: referenceYear,
          source,
          collection_method: 'MANUAL',
          note: note ?? 'Sem dado cacheado para este município. Preencha manualmente.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        indicator_code: 'MST_TSE_TURNOUT',
        value,
        reference_year: referenceYear,
        source,
        collection_method: 'AUTOMATIC',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('ingest-tse error:', err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
