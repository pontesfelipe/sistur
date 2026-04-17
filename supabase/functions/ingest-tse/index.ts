// Edge function: ingest-tse
// Calcula comparecimento eleitoral por município usando dados abertos do TSE.
// Indicador: MST_TSE_TURNOUT (Mandala da Sustentabilidade no Turismo).
//
// Fonte primária: https://dadosabertos.tse.jus.br/dataset/resultados-{ano}
// Para o MVP, lê de uma tabela curada `tse_turnout_cache` populada pelo admin.
// Quando org_id é fornecido, faz UPSERT em external_indicator_values para que
// o indicador apareça no painel de pré-preenchimento (DataValidationPanel).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  ibge_code: string;
  org_id?: string;
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

    let value: number | null = null;
    let referenceYear: number | null = body.year ?? null;
    const source = 'TSE — dadosabertos.tse.jus.br';
    let note: string | null = null;
    let collectionMethod: 'AUTOMATIC' | 'MANUAL' = 'MANUAL';

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
        collectionMethod = 'AUTOMATIC';
      }
    } catch (_e) {
      note = 'Cache TSE indisponível. Colete manualmente via tse.jus.br/eleicoes/estatisticas.';
    }

    // Persist into external_indicator_values when org_id is provided so the
    // pre-fill panel (DataValidationPanel) can display the MST indicator.
    let upserted = false;
    if (body.org_id && value !== null) {
      const { error: upsertError } = await supabase
        .from('external_indicator_values')
        .upsert({
          indicator_code: 'MST_TSE_TURNOUT',
          municipality_ibge_code: body.ibge_code,
          source_code: 'TSE',
          raw_value: value,
          reference_year: referenceYear,
          collection_method: 'AUTOMATIC' as const,
          confidence_level: 5,
          validated: false,
          org_id: body.org_id,
          notes: `TSE — comparecimento eleitoral ${referenceYear}: ${value}%. 🌀 MST.`,
        }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
      upserted = !upsertError;
      if (upsertError) console.error('TSE upsert error:', upsertError);
    }

    return new Response(
      JSON.stringify({
        indicator_code: 'MST_TSE_TURNOUT',
        value,
        reference_year: referenceYear,
        source,
        collection_method: collectionMethod,
        upserted,
        note: note ?? (value === null ? 'Sem dado cacheado para este município. Preencha manualmente.' : null),
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
