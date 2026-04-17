// Edge function: ingest-anatel
// Calcula score de conectividade digital turística (5G/4G/Wi-Fi) por município.
// Indicador: MST_5G_WIFI (Mandala da Sustentabilidade no Turismo).
//
// Fonte: dados.anatel.gov.br (Mosaico — cobertura móvel por município).
// Score 0-100 = (peso 5G * cobertura 5G) + (peso 4G * cobertura 4G) + (peso Wi-Fi público).
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
}

// Pesos do score composto
const WEIGHT_5G = 0.5;
const WEIGHT_4G = 0.3;
const WEIGHT_WIFI = 0.2;

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

    let coverage5g = 0;
    let coverage4g = 0;
    let wifiPublic = 0;
    let referenceYear: number | null = null;
    let collectionMethod: 'AUTOMATIC' | 'MANUAL' = 'MANUAL';
    let note: string | null = null;

    try {
      const { data: cached } = await supabase
        .from('anatel_coverage_cache' as any)
        .select('coverage_5g_pct, coverage_4g_pct, wifi_public_score, reference_year')
        .eq('ibge_code', body.ibge_code)
        .order('reference_year', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        coverage5g = Number((cached as any).coverage_5g_pct ?? 0);
        coverage4g = Number((cached as any).coverage_4g_pct ?? 0);
        wifiPublic = Number((cached as any).wifi_public_score ?? 0);
        referenceYear = Number((cached as any).reference_year);
        collectionMethod = 'AUTOMATIC';
      }
    } catch (_e) {
      note = 'Cache Anatel indisponível. Colete manualmente em dados.anatel.gov.br.';
    }

    const score = Math.round(
      WEIGHT_5G * coverage5g + WEIGHT_4G * coverage4g + WEIGHT_WIFI * wifiPublic,
    );

    const value = collectionMethod === 'AUTOMATIC' ? score : null;

    // Persist into external_indicator_values when org_id is provided so the
    // pre-fill panel (DataValidationPanel) can display the MST indicator.
    let upserted = false;
    if (body.org_id && value !== null) {
      const { error: upsertError } = await supabase
        .from('external_indicator_values')
        .upsert({
          indicator_code: 'MST_5G_WIFI',
          municipality_ibge_code: body.ibge_code,
          source_code: 'ANATEL',
          raw_value: value,
          reference_year: referenceYear,
          collection_method: 'AUTOMATIC' as const,
          confidence_level: 5,
          validated: false,
          org_id: body.org_id,
          notes: `Anatel ${referenceYear} — Score ${value}/100 (5G: ${coverage5g}%, 4G: ${coverage4g}%, Wi-Fi público: ${wifiPublic}). 🌀 MST.`,
        }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
      upserted = !upsertError;
      if (upsertError) console.error('Anatel upsert error:', upsertError);
    }

    return new Response(
      JSON.stringify({
        indicator_code: 'MST_5G_WIFI',
        value,
        reference_year: referenceYear,
        source: 'Anatel — dados.anatel.gov.br (Mosaico)',
        collection_method: collectionMethod,
        upserted,
        breakdown: collectionMethod === 'AUTOMATIC'
          ? { coverage_5g: coverage5g, coverage_4g: coverage4g, wifi_public: wifiPublic }
          : null,
        note: note ?? null,
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
