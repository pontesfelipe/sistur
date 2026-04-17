// Edge function: ingest-tse
// Cria placeholder MANUAL em external_indicator_values para o indicador MST_TSE_TURNOUT.
//
// IMPORTANTE: Não existe API pública/aberta do TSE acessível por edge function
// que retorne comparecimento eleitoral por município (todos os endpoints
// oficiais bloqueiam tráfego de datacenter). Por isso este indicador é tratado
// como MANUAL: criamos um registro vazio no painel de pré-preenchimento com
// link direto à fonte oficial para o usuário consultar e preencher.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  ibge_code: string;
  org_id?: string;
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

    const sourceUrl = 'https://www.tse.jus.br/eleicoes/estatisticas/estatisticas-eleitorais';
    const note = `🌀 MST — Comparecimento eleitoral. Consulte o último pleito (geral 2022 ou municipal 2024) em ${sourceUrl} e informe o percentual.`;

    let upserted = false;
    if (body.org_id) {
      // Only create placeholder if no value exists yet (don't overwrite manual entries)
      const { data: existing } = await supabase
        .from('external_indicator_values')
        .select('id, raw_value, collection_method')
        .eq('org_id', body.org_id)
        .eq('municipality_ibge_code', body.ibge_code)
        .eq('indicator_code', 'MST_TSE_TURNOUT')
        .maybeSingle();

      if (!existing || (existing.raw_value === null && !existing.validated)) {
        const { error: upsertError } = await supabase
          .from('external_indicator_values')
          .upsert({
            indicator_code: 'MST_TSE_TURNOUT',
            municipality_ibge_code: body.ibge_code,
            source_code: 'TSE',
            raw_value: null,
            reference_year: null,
            collection_method: 'MANUAL' as const,
            confidence_level: 3,
            validated: false,
            org_id: body.org_id,
            notes: note,
          }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
        upserted = !upsertError;
        if (upsertError) console.error('TSE placeholder upsert error:', upsertError);
      }
    }

    return new Response(
      JSON.stringify({
        indicator_code: 'MST_TSE_TURNOUT',
        value: null,
        source: 'TSE — preenchimento manual',
        source_url: sourceUrl,
        collection_method: 'MANUAL',
        upserted,
        note,
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
