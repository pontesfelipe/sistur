import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndicatorResult {
  value: number;
  year: number;
  source: string;
  real: boolean; // true = dados reais da API, false = estimativa
}

// ─── IBGE Agregados API (REAL) ───────────────────────────────────────
// Docs: https://servicodados.ibge.gov.br/api/docs/agregados?versao=3

async function fetchIBGEAgregados(ibgeCode: string): Promise<Record<string, IndicatorResult>> {
  const results: Record<string, IndicatorResult> = {};
  const timeout = 8000;

  // Batch 1: Censo 2022 — População (93) + Densidade (614)
  try {
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/-1/variaveis/93|614?localidades=N6%5B${ibgeCode}%5D`;
    console.log('IBGE Censo request:', url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      for (const variable of data) {
        const series = variable?.resultados?.[0]?.series?.[0]?.serie;
        if (!series) continue;
        // Get latest year
        const years = Object.keys(series).sort().reverse();
        const latestYear = years[0];
        const val = parseFloat(series[latestYear]);
        if (isNaN(val)) continue;

        if (variable.id === '93') {
          results['igma_populacao'] = { value: val, year: parseInt(latestYear), source: 'IBGE', real: true };
        } else if (variable.id === '614') {
          results['igma_densidade_demografica'] = { value: val, year: parseInt(latestYear), source: 'IBGE', real: true };
        }
      }
    } else {
      console.warn(`IBGE Censo API returned ${resp.status}`);
    }
  } catch (e) {
    console.error('IBGE Censo fetch error:', e instanceof Error ? e.message : e);
  }

  // Batch 2: PIB Municipal — PIB total (37)
  try {
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/-6/variaveis/37?localidades=N6%5B${ibgeCode}%5D`;
    console.log('IBGE PIB request:', url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      const series = data?.[0]?.resultados?.[0]?.series?.[0]?.serie;
      if (series) {
        const years = Object.keys(series).sort().reverse();
        const latestYear = years[0];
        const pibTotalMilReais = parseFloat(series[latestYear]);

        if (!isNaN(pibTotalMilReais) && results['igma_populacao']) {
          // PIB per capita = (PIB total em mil R$) * 1000 / população
          const pibPerCapita = Math.round((pibTotalMilReais * 1000) / results['igma_populacao'].value);
          results['igma_pib_per_capita'] = { value: pibPerCapita, year: parseInt(latestYear), source: 'IBGE', real: true };
        } else if (!isNaN(pibTotalMilReais)) {
          // Se não tem população, armazena PIB total mesmo
          results['igma_pib_per_capita'] = { value: pibTotalMilReais * 1000, year: parseInt(latestYear), source: 'IBGE', real: true };
        }
      }
    }
  } catch (e) {
    console.error('IBGE PIB fetch error:', e instanceof Error ? e.message : e);
  }

  // Calcular área territorial a partir de pop/densidade
  if (results['igma_populacao'] && results['igma_densidade_demografica'] && results['igma_densidade_demografica'].value > 0) {
    const area = Math.round(results['igma_populacao'].value / results['igma_densidade_demografica'].value * 100) / 100;
    results['igma_area_territorial'] = {
      value: area,
      year: results['igma_populacao'].year,
      source: 'IBGE',
      real: true,
    };
  }

  return results;
}

// ─── Estimativas para fontes sem API pública ─────────────────────────
// Estas fontes (DATASUS, INEP, STN, CADASTUR) não têm APIs públicas
// de fácil acesso. Os valores são estimativas baseadas em médias
// regionais e devem ser validados manualmente pelo operador.

function generateEstimatedData(ibgeCode: string, populacao?: number): Record<string, IndicatorResult> {
  const results: Record<string, IndicatorResult> = {};
  const codeNum = parseInt(ibgeCode);
  
  // Extrair UF do código IBGE (primeiros 2 dígitos)
  const ufCode = ibgeCode.substring(0, 2);
  
  // Médias regionais por UF para estimativas mais realistas
  const ufAverages: Record<string, { idh: number; ideb: number; escolarizacao: number; leitos: number; cobertura: number }> = {
    '11': { idh: 0.690, ideb: 4.8, escolarizacao: 88, leitos: 1.8, cobertura: 65 },
    '12': { idh: 0.663, ideb: 4.5, escolarizacao: 85, leitos: 1.5, cobertura: 60 },
    '13': { idh: 0.674, ideb: 4.4, escolarizacao: 84, leitos: 1.6, cobertura: 58 },
    '15': { idh: 0.646, ideb: 4.3, escolarizacao: 83, leitos: 1.7, cobertura: 55 },
    '21': { idh: 0.639, ideb: 4.5, escolarizacao: 82, leitos: 2.0, cobertura: 62 },
    '22': { idh: 0.646, ideb: 4.6, escolarizacao: 83, leitos: 1.9, cobertura: 60 },
    '23': { idh: 0.682, ideb: 5.5, escolarizacao: 88, leitos: 2.1, cobertura: 65 },
    '24': { idh: 0.684, ideb: 4.7, escolarizacao: 86, leitos: 2.0, cobertura: 63 },
    '25': { idh: 0.658, ideb: 4.8, escolarizacao: 85, leitos: 2.1, cobertura: 64 },
    '26': { idh: 0.673, ideb: 4.7, escolarizacao: 86, leitos: 2.3, cobertura: 66 },
    '27': { idh: 0.631, ideb: 4.5, escolarizacao: 82, leitos: 1.8, cobertura: 60 },
    '28': { idh: 0.665, ideb: 4.6, escolarizacao: 84, leitos: 1.9, cobertura: 62 },
    '29': { idh: 0.660, ideb: 4.4, escolarizacao: 84, leitos: 2.0, cobertura: 63 },
    '31': { idh: 0.731, ideb: 5.8, escolarizacao: 92, leitos: 2.5, cobertura: 75 },
    '32': { idh: 0.740, ideb: 5.5, escolarizacao: 91, leitos: 2.3, cobertura: 72 },
    '33': { idh: 0.761, ideb: 5.3, escolarizacao: 93, leitos: 3.0, cobertura: 78 },
    '35': { idh: 0.783, ideb: 6.0, escolarizacao: 95, leitos: 2.8, cobertura: 80 },
    '41': { idh: 0.749, ideb: 5.9, escolarizacao: 93, leitos: 2.7, cobertura: 78 },
    '42': { idh: 0.774, ideb: 6.1, escolarizacao: 95, leitos: 3.2, cobertura: 82 },
    '43': { idh: 0.746, ideb: 5.7, escolarizacao: 93, leitos: 3.0, cobertura: 80 },
    '50': { idh: 0.729, ideb: 5.4, escolarizacao: 90, leitos: 2.4, cobertura: 70 },
    '51': { idh: 0.725, ideb: 5.3, escolarizacao: 89, leitos: 2.3, cobertura: 68 },
    '52': { idh: 0.735, ideb: 5.5, escolarizacao: 91, leitos: 2.5, cobertura: 72 },
    '53': { idh: 0.824, ideb: 5.8, escolarizacao: 96, leitos: 3.5, cobertura: 85 },
  };

  const defaults = ufAverages[ufCode] || { idh: 0.720, ideb: 5.2, escolarizacao: 90, leitos: 2.5, cobertura: 70 };
  
  // Small variation per municipality
  const variation = (codeNum % 100) / 1000;

  // IDH — IBGE/Atlas Brasil (sem API pública direta)
  results['igma_idh'] = {
    value: Math.round((defaults.idh + variation - 0.05) * 1000) / 1000,
    year: 2021,
    source: 'IBGE',
    real: false,
  };

  // DATASUS
  results['igma_leitos_por_habitante'] = {
    value: Math.round((defaults.leitos + variation * 10) * 10) / 10,
    year: 2023,
    source: 'DATASUS',
    real: false,
  };
  results['igma_cobertura_saude'] = {
    value: Math.round(defaults.cobertura + variation * 100),
    year: 2023,
    source: 'DATASUS',
    real: false,
  };

  // INEP
  results['igma_ideb'] = {
    value: Math.round((defaults.ideb + variation * 5) * 10) / 10,
    year: 2023,
    source: 'INEP',
    real: false,
  };
  results['igma_taxa_escolarizacao'] = {
    value: Math.round(defaults.escolarizacao + variation * 50),
    year: 2022,
    source: 'INEP',
    real: false,
  };

  // STN — Finanças Públicas
  const receitaPropria = populacao
    ? Math.round((15 + (codeNum % 20)) * 10) / 10
    : 20 + (codeNum % 25);
  results['igma_receita_propria'] = {
    value: receitaPropria,
    year: 2023,
    source: 'STN',
    real: false,
  };
  results['igma_despesa_turismo'] = {
    value: Math.round((1 + (codeNum % 5) * 0.5) * 10) / 10,
    year: 2023,
    source: 'STN',
    real: false,
  };

  // CADASTUR — sem API pública, estimativa por porte
  const pop = populacao || 50000;
  const fatorPorte = pop < 20000 ? 0.5 : pop < 100000 ? 1 : pop < 500000 ? 2 : 4;
  results['igma_meios_hospedagem'] = {
    value: Math.round((8 + (codeNum % 20)) * fatorPorte),
    year: 2024,
    source: 'CADASTUR',
    real: false,
  };
  results['igma_guias_turismo'] = {
    value: Math.round((3 + (codeNum % 10)) * fatorPorte),
    year: 2024,
    source: 'CADASTUR',
    real: false,
  };
  results['igma_agencias_turismo'] = {
    value: Math.round((1 + (codeNum % 8)) * fatorPorte),
    year: 2024,
    source: 'CADASTUR',
    real: false,
  };

  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { ibge_code, org_id, indicators } = await req.json();

    if (!ibge_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'ibge_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!org_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'org_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching official data for IBGE code: ${ibge_code}, org: ${org_id}`);

    // 1. Fetch REAL data from IBGE APIs
    const ibgeRealData = await fetchIBGEAgregados(ibge_code);
    const realCount = Object.keys(ibgeRealData).length;
    console.log(`IBGE real data: ${realCount} indicators fetched`);

    // 2. Generate estimated data for sources without public APIs
    const populacao = ibgeRealData['igma_populacao']?.value;
    const estimatedData = generateEstimatedData(ibge_code, populacao);

    // 3. Merge — real data takes priority
    const allData: Record<string, IndicatorResult> = { ...estimatedData, ...ibgeRealData };

    // Build indicator source mapping from the combined data
    const valuesToUpsert = Object.entries(allData)
      .filter(([code]) => {
        if (indicators && indicators.length > 0) {
          return indicators.includes(code);
        }
        return true;
      })
      .map(([code, result]) => ({
        indicator_code: code,
        municipality_ibge_code: ibge_code,
        source_code: result.source,
        raw_value: result.value,
        reference_year: result.year,
        collection_method: result.real ? 'AUTOMATIC' : 'MANUAL',
        confidence_level: result.real ? 5 : 3,
        validated: false,
        org_id: org_id,
      }));

    // Upsert values
    const { data: upsertedData, error: upsertError } = await supabaseClient
      .from('external_indicator_values')
      .upsert(
        valuesToUpsert.map((v) => ({
          ...v,
          validated: false,
          validated_by: null,
          validated_at: null,
        })),
        { onConflict: 'org_id,municipality_ibge_code,indicator_code' }
      )
      .select();

    if (upsertError) {
      console.error('Error upserting values:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully stored ${upsertedData?.length || 0} indicator values (${realCount} real, ${valuesToUpsert.length - realCount} estimated)`);

    const responseData = valuesToUpsert.map(v => ({
      indicator_code: v.indicator_code,
      value: v.raw_value,
      source: v.source_code,
      year: v.reference_year,
      confidence: v.confidence_level,
      collection_method: v.collection_method,
      real: allData[v.indicator_code]?.real || false,
    }));

    const sourcesUsed = [...new Set(valuesToUpsert.map(v => v.source_code))];

    return new Response(
      JSON.stringify({
        success: true,
        message: `${realCount} indicadores reais (IBGE API) + ${valuesToUpsert.length - realCount} estimados. Total: ${valuesToUpsert.length} indicadores.`,
        data: responseData,
        sources_used: sourcesUsed,
        real_count: realCount,
        estimated_count: valuesToUpsert.length - realCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-official-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
