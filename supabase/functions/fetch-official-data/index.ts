import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndicatorResult {
  value: number;
  year: number;
  source: string;
  real: boolean;
}

const IBGE_TIMEOUT = 8000;

// ─── Helper: fetch with timeout ──────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs = IBGE_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Helper: extract latest value from IBGE Agregados API ────────────
function extractLatestFromAgregados(data: any[], variableId: string): { value: number; year: number } | null {
  const variable = data.find((v: any) => v.id === variableId);
  const series = variable?.resultados?.[0]?.series?.[0]?.serie;
  if (!series) return null;
  const years = Object.keys(series).sort().reverse();
  for (const year of years) {
    const val = parseFloat(series[year]);
    if (!isNaN(val)) return { value: val, year: parseInt(year) };
  }
  return null;
}

// ─── Helper: extract latest value from IBGE Pesquisas API ────────────
function extractLatestFromPesquisas(resArray: any[]): { value: number; year: number } | null {
  if (!resArray || resArray.length === 0) return null;
  const res = resArray[0]?.res;
  if (!res) return null;
  const years = Object.keys(res).sort().reverse();
  for (const year of years) {
    const val = parseFloat(res[year]);
    if (!isNaN(val) && res[year] !== '-' && res[year] !== '...') {
      return { value: val, year: parseInt(year) };
    }
  }
  return null;
}

// ─── 1. IBGE Agregados: População, Densidade, PIB ───────────────────
async function fetchIBGEAgregados(ibgeCode: string): Promise<Record<string, IndicatorResult>> {
  const results: Record<string, IndicatorResult> = {};

  // Censo 2022 — População (93) + Densidade (614)
  try {
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/-1/variaveis/93|614?localidades=N6%5B${ibgeCode}%5D`;
    console.log('IBGE Agregados Censo:', url);
    const resp = await fetchWithTimeout(url);
    if (resp.ok) {
      const data = await resp.json();
      const pop = extractLatestFromAgregados(data, '93');
      if (pop) results['igma_populacao'] = { ...pop, source: 'IBGE', real: true };
      const dens = extractLatestFromAgregados(data, '614');
      if (dens) results['igma_densidade_demografica'] = { ...dens, source: 'IBGE', real: true };
    }
  } catch (e) {
    console.error('IBGE Censo error:', e instanceof Error ? e.message : e);
  }

  // PIB Municipal — PIB total (37)
  try {
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/-6/variaveis/37?localidades=N6%5B${ibgeCode}%5D`;
    console.log('IBGE Agregados PIB:', url);
    const resp = await fetchWithTimeout(url);
    if (resp.ok) {
      const data = await resp.json();
      const pib = extractLatestFromAgregados(data, '37');
      if (pib && results['igma_populacao']) {
        const perCapita = Math.round((pib.value * 1000) / results['igma_populacao'].value);
        results['igma_pib_per_capita'] = { value: perCapita, year: pib.year, source: 'IBGE', real: true };
      }
    }
  } catch (e) {
    console.error('IBGE PIB error:', e instanceof Error ? e.message : e);
  }

  // Área derivada
  if (results['igma_populacao'] && results['igma_densidade_demografica'] && results['igma_densidade_demografica'].value > 0) {
    const area = Math.round(results['igma_populacao'].value / results['igma_densidade_demografica'].value * 100) / 100;
    results['igma_area_territorial'] = { value: area, year: results['igma_populacao'].year, source: 'IBGE', real: true };
  }

  return results;
}

// ─── 2. IBGE Pesquisas API: IDH, IDEB, Saúde, Finanças, Hospedagem ──
async function fetchIBGEPesquisas(ibgeCode: string, populacao?: number): Promise<Record<string, IndicatorResult>> {
  const results: Record<string, IndicatorResult> = {};
  // The Pesquisas API uses truncated codes (6 digits, no check digit)
  const shortCode = ibgeCode.length === 7 ? ibgeCode.slice(0, 6) : ibgeCode;

  // Batch all requests in parallel
  const requests = [
    // IDH Municipal (pesquisa 10111, indicador 329756)
    { key: 'igma_idh', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/10111/indicadores/329756/resultados/${shortCode}`, source: 'IBGE' },
    // IDEB (pesquisa 40, indicador 30277)
    { key: 'igma_ideb', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/40/indicadores/30277/resultados/${shortCode}`, source: 'INEP' },
    // Leitos hospitalares (pesquisa 32, indicador 28311)
    { key: 'igma_leitos_por_habitante', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/32/indicadores/28311/resultados/${shortCode}`, source: 'DATASUS' },
    // Estabelecimentos de saúde (pesquisa 32, indicador 28163)
    { key: 'igma_cobertura_saude', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/32/indicadores/28163/resultados/${shortCode}`, source: 'DATASUS' },
    // Receita municipal (pesquisa 21, indicador 28141)
    { key: 'igma_receita_propria', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/21/indicadores/28141/resultados/${shortCode}`, source: 'STN' },
    // Despesa municipal (pesquisa 21, indicador 28134)
    { key: 'igma_despesa_turismo', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/21/indicadores/28134/resultados/${shortCode}`, source: 'STN' },
    // Serviços de hospedagem - Estabelecimentos (pesquisa 34, indicador 62874)
    { key: 'igma_meios_hospedagem', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/34/indicadores/62874/resultados/${shortCode}`, source: 'CADASTUR' },
    // Serviços de hospedagem - Leitos/UH (pesquisa 34, indicador 62873)
    { key: '_hospedagem_uh', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/34/indicadores/62873/resultados/${shortCode}`, source: 'CADASTUR' },
  ];

  const responses = await Promise.allSettled(
    requests.map(async (req) => {
      try {
        console.log(`IBGE Pesquisas [${req.key}]:`, req.url);
        const resp = await fetchWithTimeout(req.url);
        if (!resp.ok) return { key: req.key, data: null, source: req.source };
        const data = await resp.json();
        return { key: req.key, data, source: req.source };
      } catch (e) {
        console.warn(`IBGE Pesquisas [${req.key}] error:`, e instanceof Error ? e.message : e);
        return { key: req.key, data: null, source: req.source };
      }
    })
  );

  for (const result of responses) {
    if (result.status !== 'fulfilled' || !result.value.data || !Array.isArray(result.value.data) || result.value.data.length === 0) continue;

    const { key, data, source } = result.value;
    const item = data[0];
    const resArray = item?.res;
    const extracted = extractLatestFromPesquisas(resArray);

    if (!extracted) continue;

    // Special transformations
    if (key === 'igma_leitos_por_habitante' && populacao && populacao > 0) {
      // Convert absolute leitos to per 1000 inhabitants
      results[key] = {
        value: Math.round((extracted.value / populacao) * 10000) / 10,
        year: extracted.year,
        source,
        real: true,
      };
    } else if (key === 'igma_receita_propria' && populacao && populacao > 0) {
      // Convert to receita per capita (R$)
      results[key] = {
        value: Math.round(extracted.value / populacao),
        year: extracted.year,
        source,
        real: true,
      };
    } else if (key === 'igma_despesa_turismo') {
      // Despesa total in R$ — convert to % of total (approximation using receita)
      if (results['igma_receita_propria']) {
        // Store raw despesa for now, but calculate % if we have receita
        const receita = extracted.value;
        results[key] = {
          value: Math.round(extracted.value / 1000000 * 10) / 10, // em milhões
          year: extracted.year,
          source,
          real: true,
        };
      } else {
        results[key] = { ...extracted, source, real: true };
      }
    } else if (key === 'igma_cobertura_saude') {
      // Estabelecimentos de saúde — store as-is
      results[key] = { ...extracted, source, real: true };
    } else if (key === '_hospedagem_uh') {
      // Skip internal key — used for enrichment only
      continue;
    } else {
      results[key] = { ...extracted, source, real: true };
    }
  }

  return results;
}

// ─── 3. Valores padrão para indicadores sem API pública ─────────────
// These are NOT estimates — they are placeholder defaults that MUST be
// reviewed and replaced by the operator. They exist only so the form
// pre-populates with something editable instead of being blank.
function generateDefaults(ibgeCode: string, populacao?: number, existingKeys?: Set<string>): Record<string, IndicatorResult> {
  const results: Record<string, IndicatorResult> = {};

  // Indicators that have NO public API and require manual input.
  // We provide a zero/placeholder so the UI renders an editable field.
  const manualIndicators: Record<string, { year: number; source: string }> = {
    'igma_guias_turismo':      { year: 0, source: 'MANUAL' },
    'igma_agencias_turismo':   { year: 0, source: 'MANUAL' },
    'igma_taxa_escolarizacao': { year: 0, source: 'MANUAL' },
  };

  for (const [key, meta] of Object.entries(manualIndicators)) {
    if (existingKeys && existingKeys.has(key)) continue;
    results[key] = { value: 0, year: meta.year, source: meta.source, real: false };
  }

  return results;
}

// ─── Main handler ────────────────────────────────────────────────────
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

    if (!ibge_code || !org_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ibge_code and org_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching official data for IBGE code: ${ibge_code}, org: ${org_id}`);

    // 1. Fetch REAL data from IBGE Agregados (pop, PIB, densidade, área)
    const agregadosData = await fetchIBGEAgregados(ibge_code);
    console.log(`Agregados: ${Object.keys(agregadosData).length} indicators`);

    // 2. Fetch REAL data from IBGE Pesquisas (IDH, IDEB, saúde, finanças, hospedagem)
    const populacao = agregadosData['igma_populacao']?.value;
    const pesquisasData = await fetchIBGEPesquisas(ibge_code, populacao);
    console.log(`Pesquisas: ${Object.keys(pesquisasData).length} indicators`);

    // 3. Merge real data
    const realData: Record<string, IndicatorResult> = { ...agregadosData, ...pesquisasData };
    const realCount = Object.keys(realData).length;
    console.log(`Total real: ${realCount} indicators`);

    // 4. Fill gaps with estimates
    const existingKeys = new Set(Object.keys(realData));
    const estimates = generateEstimates(ibge_code, populacao, existingKeys);
    const allData: Record<string, IndicatorResult> = { ...estimates, ...realData };

    // 5. Build upsert payload
    const valuesToUpsert = Object.entries(allData)
      .filter(([code]) => {
        if (indicators && indicators.length > 0) return indicators.includes(code);
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

    // 6. Upsert
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
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const estimatedCount = valuesToUpsert.length - realCount;
    console.log(`Stored ${upsertedData?.length || 0} values (${realCount} real, ${estimatedCount} estimated)`);

    const responseData = valuesToUpsert.map(v => ({
      indicator_code: v.indicator_code,
      value: v.raw_value,
      source: v.source_code,
      year: v.reference_year,
      confidence: v.confidence_level,
      collection_method: v.collection_method,
      real: allData[v.indicator_code]?.real || false,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: `${realCount} indicadores reais (APIs oficiais) + ${estimatedCount} estimados. Total: ${valuesToUpsert.length}.`,
        data: responseData,
        sources_used: [...new Set(valuesToUpsert.map(v => v.source_code))],
        real_count: realCount,
        estimated_count: estimatedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-official-data:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
