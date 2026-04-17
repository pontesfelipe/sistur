// Edge function: ingest-anatel
// Cria placeholder MANUAL em external_indicator_values para o indicador MST_5G_WIFI.
//
// IMPORTANTE: O painel da Anatel (Mosaico de cobertura móvel) e o portal
// dados.anatel.gov.br exigem autenticação ou bloqueiam tráfego de datacenter,
// inviabilizando ingestão automática a partir de edge function. Por isso este
// indicador é tratado como MANUAL: criamos um registro vazio no painel de
// pré-preenchimento com link à fonte oficial.
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

    const sourceUrl = 'https://informacoes.anatel.gov.br/paineis/acessos/panorama';
    const note = `🌀 MST — Conectividade digital turística. Consulte cobertura 5G/4G do município em ${sourceUrl} e informe um score 0-100 (peso: 50% 5G + 30% 4G + 20% Wi-Fi público).`;

    let upserted = false;
    if (body.org_id) {
      const { data: existing } = await supabase
        .from('external_indicator_values')
        .select('id, raw_value, validated')
        .eq('org_id', body.org_id)
        .eq('municipality_ibge_code', body.ibge_code)
        .eq('indicator_code', 'MST_5G_WIFI')
        .maybeSingle();

      if (!existing || (existing.raw_value === null && !existing.validated)) {
        const { error: upsertError } = await supabase
          .from('external_indicator_values')
          .upsert({
            indicator_code: 'MST_5G_WIFI',
            municipality_ibge_code: body.ibge_code,
            source_code: 'ANATEL',
            raw_value: null,
            reference_year: null,
            collection_method: 'MANUAL' as const,
            confidence_level: 3,
            validated: false,
            org_id: body.org_id,
            notes: note,
          }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
        upserted = !upsertError;
        if (upsertError) console.error('Anatel placeholder upsert error:', upsertError);
      }
    }

    return new Response(
      JSON.stringify({
        indicator_code: 'MST_5G_WIFI',
        value: null,
        source: 'Anatel — preenchimento manual',
        source_url: sourceUrl,
        collection_method: 'MANUAL',
        upserted,
        note,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('ingest-anatel error:', err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
