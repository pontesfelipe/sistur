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
    // ─── NEW: Taxa de mortalidade infantil (pesquisa 39, indicador 30279)
    { key: 'igma_taxa_de_mortalidade_infantil', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/39/indicadores/30279/resultados/${shortCode}`, source: 'DATASUS' },
    // ─── NEW: Óbitos / Mortalidade geral (pesquisa 17, indicador 15752)
    { key: 'igma_mortalidade_geral_por_mil_habitantes', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/17/indicadores/15752/resultados/${shortCode}`, source: 'DATASUS' },
    // ─── NEW: Índice de Gini (pesquisa 36, indicador 30252)
    { key: 'igma_indice_de_gini_da_renda_domiciliar_per_capita', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/36/indicadores/30252/resultados/${shortCode}`, source: 'IBGE' },
    // ─── NEW: Incidência de pobreza (pesquisa 36, indicador 30246)
    { key: 'igma_populacao_de_baixa_renda', url: `https://servicodados.ibge.gov.br/api/v1/pesquisas/36/indicadores/30246/resultados/${shortCode}`, source: 'IBGE' },
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
      // Despesa total in R$ — convert to millions
      results[key] = {
        value: Math.round(extracted.value / 1000000 * 10) / 10,
        year: extracted.year,
        source,
        real: true,
      };
    } else if (key === 'igma_mortalidade_geral_por_mil_habitantes' && populacao && populacao > 0) {
      // Convert absolute deaths to per 1000 inhabitants
      results[key] = {
        value: Math.round((extracted.value / populacao) * 10000) / 10,
        year: extracted.year,
        source,
        real: true,
      };
    } else if (key === '_hospedagem_uh') {
      // Skip internal key — used for enrichment only
      continue;
    } else {
      results[key] = { ...extracted, source, real: true };
    }
  }

  return results;
}

// ─── 2b. SIDRA API: Censo 2010 Saneamento (table 3217) ──────────────
async function fetchSIDRASaneamento(ibgeCode: string): Promise<Record<string, IndicatorResult>> {
  const results: Record<string, IndicatorResult> = {};

  // Table 3217: Domicílios por abastecimento de água, destino do lixo
  // v/1000096 = percentual do total geral
  // c61 = Forma de abastecimento de água; category 92853 = Rede geral
  // c67 = Destino do lixo; category 11233 = Coletado (serviço de limpeza)
  const queries = [
    {
      key: 'igma_abastecimento_de_agua',
      url: `https://apisidra.ibge.gov.br/values/t/3217/n6/${ibgeCode}/v/1000096/p/last%201/c61/92853`,
      source: 'IBGE_CENSO',
    },
    {
      key: 'igma_coleta_de_lixo_domiciliar',
      url: `https://apisidra.ibge.gov.br/values/t/3217/n6/${ibgeCode}/v/1000096/p/last%201/c67/allxt`,
      source: 'IBGE_CENSO',
      // Sum "Coletado" categories (serviço de limpeza + caçamba)
      aggregate: true,
      targetCategories: ['Coletado por serviço de limpeza', 'Coletado em caçamba de serviço de limpeza'],
    },
  ];

  const responses = await Promise.allSettled(
    queries.map(async (q) => {
      try {
        console.log(`SIDRA [${q.key}]:`, q.url);
        const resp = await fetchWithTimeout(q.url, 10000);
        if (!resp.ok) return { ...q, data: null };
        const data = await resp.json();
        return { ...q, data };
      } catch (e) {
        console.warn(`SIDRA [${q.key}] error:`, e instanceof Error ? e.message : e);
        return { ...q, data: null };
      }
    })
  );

  for (const result of responses) {
    if (result.status !== 'fulfilled' || !result.value.data) continue;
    const { key, data, source, aggregate, targetCategories } = result.value as any;
    if (!Array.isArray(data) || data.length < 2) continue;

    if (aggregate && targetCategories) {
      // Sum matching categories
      let total = 0;
      let year = 0;
      for (const row of data.slice(1)) {
        const catName = row.D4N || '';
        const val = parseFloat(row.V);
        if (!isNaN(val) && targetCategories.some((t: string) => catName.includes(t))) {
          total += val;
        }
        if (!year && row.D3N) year = parseInt(row.D3N);
      }
      if (total > 0) {
        results[key] = { value: Math.round(total * 100) / 100, year, source, real: true };
      }
    } else {
      // Single value
      const row = data[1];
      const val = parseFloat(row?.V);
      const year = parseInt(row?.D3N || '0');
      if (!isNaN(val)) {
        results[key] = { value: Math.round(val * 100) / 100, year, source, real: true };
      }
    }
  }

  return results;
}

// ─── 3. Mapa do Turismo Brasileiro (REST API + DB fallback) ─────────
async function fetchMapaTurismo(
  supabaseClient: any,
  ibgeCode: string
): Promise<Record<string, IndicatorResult>> {
  const results: Record<string, IndicatorResult> = {};
  const currentYear = new Date().getFullYear();

  // Strategy 1: Try the live REST API from mapa.turismo.gov.br
  try {
    // First get nuUf and nuLocalidade by looking up the IBGE code
    const ufListResp = await fetchWithTimeout('https://www.mapa.turismo.gov.br/mapa/rest/publico/dne/listaUF');
    if (ufListResp.ok) {
      const ufList: any[] = await ufListResp.json();

      // Try each UF to find our municipality by IBGE code
      for (const uf of ufList) {
        const locResp = await fetchWithTimeout(
          `https://www.mapa.turismo.gov.br/mapa/rest/publico/dne/localidadesDaUfSemShape?nuUf=${uf.nuUf}`
        );
        if (!locResp.ok) continue;
        const localidades: any[] = await locResp.json();
        const match = localidades.find((l: any) => l.nuMunicipioIbge === ibgeCode);

        if (match) {
          console.log(`Found municipality in API: ${match.noLocalidade} (${uf.sgUf}), nuLocalidade=${match.nuLocalidade}`);

          // Now fetch the full data
          const searchResp = await fetch('https://www.mapa.turismo.gov.br/mapa/rest/publico/regionalizacao/pesquisar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ nuUf: uf.nuUf, nuLocalidade: match.nuLocalidade }),
          });

          if (searchResp.ok) {
            const data: any[] = await searchResp.json();
            if (data.length > 0) {
              const d = data[0];
              console.log('Mapa do Turismo API data:', JSON.stringify(d));

              // Category: 1=Turístico(A), 2=Complementar(B), 3=Apoio(C)
              if (d.coCluster) {
                const clusterToValue: Record<string, number> = { '1': 5, '2': 3, '3': 1 };
                const val = clusterToValue[d.coCluster];
                if (val) {
                  results['igma_categoria_mapa_turismo'] = { value: val, year: currentYear, source: 'MAPA_TURISMO', real: true };
                }
              }

              // Tourism region
              results['igma_regiao_turistica'] = {
                value: d.noRegiaoTuristica ? 1 : 0,
                year: currentYear,
                source: 'MAPA_TURISMO',
                real: true,
              };

              // Tourism employment
              if (d.qtEmprego) {
                const emp = parseFloat(String(d.qtEmprego).replace(/\./g, '').replace(',', '.'));
                if (!isNaN(emp)) {
                  results['igma_empregos_turismo'] = { value: emp, year: currentYear, source: 'MAPA_TURISMO', real: true };
                }
              }

              // Tourism establishments
              if (d.qtEstabelecimento) {
                const est = parseFloat(String(d.qtEstabelecimento).replace(/\./g, '').replace(',', '.'));
                if (!isNaN(est)) {
                  results['igma_estabelecimentos_turismo'] = { value: est, year: currentYear, source: 'MAPA_TURISMO', real: true };
                }
              }

              // International visitors
              let visIntVal: number | null = null;
              if (d.qtVisitaInternacionalEstimada) {
                const vis = parseFloat(String(d.qtVisitaInternacionalEstimada).replace(/\./g, '').replace(',', '.'));
                if (!isNaN(vis)) {
                  visIntVal = vis;
                  results['igma_visitantes_internacionais'] = { value: vis, year: currentYear, source: 'MAPA_TURISMO', real: true };
                }
              }

              // National visitors
              let visNacVal: number | null = null;
              if (d.qtVisitaNacionalEstimada) {
                const vis = parseFloat(String(d.qtVisitaNacionalEstimada).replace(/\./g, '').replace(',', '.'));
                if (!isNaN(vis)) {
                  visNacVal = vis;
                  results['igma_visitantes_nacionais'] = { value: vis, year: currentYear, source: 'MAPA_TURISMO', real: true };
                }
              }

              // AO001 — Fluxo Turístico Anual = visitantes nacionais + internacionais
              // Auto-derived from Mapa do Turismo so the indicator pre-fills in the data entry form.
              const totalFlow = (visNacVal ?? 0) + (visIntVal ?? 0);
              if (totalFlow > 0) {
                results['AO001'] = { value: totalFlow, year: currentYear, source: 'MAPA_TURISMO', real: true };
              }

              // Tourism revenue
              if (d.arrecadacao) {
                results['igma_arrecadacao_turismo'] = { value: d.arrecadacao, year: currentYear, source: 'MAPA_TURISMO', real: true };
              }

              // Municipal tourism council
              if (d.flSituacaoConselho !== undefined) {
                results['igma_conselho_municipal_turismo'] = { value: d.flSituacaoConselho ? 1 : 0, year: currentYear, source: 'MAPA_TURISMO', real: true };
              }

              return results;
            }
          }
          break;
        }
      }
    }
  } catch (e) {
    console.warn('Mapa Turismo API error, falling back to DB:', e instanceof Error ? e.message : e);
  }

  // Strategy 2: Fallback to local DB lookup
  try {
    const { data, error } = await supabaseClient
      .from('mapa_turismo_municipios')
      .select('categoria, regiao_turistica, ano_referencia, municipality_type, raw_data')
      .or(`ibge_code.eq.${ibgeCode}`)
      .order('ano_referencia', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return results;

    if (data.categoria) {
      const catMap: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };
      const catValue = catMap[data.categoria.toUpperCase().trim()];
      if (catValue) {
        results['igma_categoria_mapa_turismo'] = { value: catValue, year: data.ano_referencia || 0, source: 'MAPA_TURISMO', real: true };
      }
    }

    results['igma_regiao_turistica'] = { value: data.regiao_turistica ? 1 : 0, year: data.ano_referencia || 0, source: 'MAPA_TURISMO', real: true };

    // Extract enriched data from raw_data if available
    const raw = data.raw_data;
    if (raw) {
      if (raw.qt_emprego) {
        const v = parseFloat(String(raw.qt_emprego).replace(/\./g, '').replace(',', '.'));
        if (!isNaN(v)) results['igma_empregos_turismo'] = { value: v, year: data.ano_referencia || 0, source: 'MAPA_TURISMO', real: true };
      }
      if (raw.qt_estabelecimento) {
        const v = parseFloat(String(raw.qt_estabelecimento).replace(/\./g, '').replace(',', '.'));
        if (!isNaN(v)) results['igma_estabelecimentos_turismo'] = { value: v, year: data.ano_referencia || 0, source: 'MAPA_TURISMO', real: true };
      }
      if (raw.arrecadacao) {
        results['igma_arrecadacao_turismo'] = { value: raw.arrecadacao, year: data.ano_referencia || 0, source: 'MAPA_TURISMO', real: true };
      }

      // Visitor counts + AO001 derivation (Fluxo Turístico Anual)
      let visNacVal = 0;
      let visIntVal = 0;
      if (raw.qt_visita_nacional) {
        const v = parseFloat(String(raw.qt_visita_nacional).replace(/\./g, '').replace(',', '.'));
        if (!isNaN(v)) {
          visNacVal = v;
          results['igma_visitantes_nacionais'] = { value: v, year: data.ano_referencia || 0, source: 'MAPA_TURISMO', real: true };
        }
      }
      if (raw.qt_visita_internacional) {
        const v = parseFloat(String(raw.qt_visita_internacional).replace(/\./g, '').replace(',', '.'));
        if (!isNaN(v)) {
          visIntVal = v;
          results['igma_visitantes_internacionais'] = { value: v, year: data.ano_referencia || 0, source: 'MAPA_TURISMO', real: true };
        }
      }
      const totalFlow = visNacVal + visIntVal;
      if (totalFlow > 0) {
        results['AO001'] = { value: totalFlow, year: data.ano_referencia || 0, source: 'MAPA_TURISMO', real: true };
      }
    }
  } catch (e) {
    console.error('Mapa Turismo DB error:', e instanceof Error ? e.message : e);
  }

  return results;
}

// ─── 4. Valores padrão para indicadores sem API pública ─────────────
// These are NOT estimates — they are placeholder defaults that MUST be
// reviewed and replaced by the operator. They exist only so the form
// pre-populates with something editable instead of being blank.
function generateDefaults(ibgeCode: string, populacao?: number, existingKeys?: Set<string>): Record<string, IndicatorResult> {
  const results: Record<string, IndicatorResult> = {};

  // Indicators that have NO public API and require manual input.
  // CADASTUR indicators (guias, agencias) are now handled by ingest-cadastur edge function.
  const manualIndicators: Record<string, { year: number; source: string }> = {
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

    // 2. Fetch REAL data from IBGE Pesquisas (IDH, IDEB, saúde, finanças, hospedagem, mortalidade, Gini)
    const populacao = agregadosData['igma_populacao']?.value;
    const pesquisasData = await fetchIBGEPesquisas(ibge_code, populacao);
    console.log(`Pesquisas: ${Object.keys(pesquisasData).length} indicators`);

    // 3. Fetch SIDRA Saneamento (Censo 2010: água, lixo)
    const sidraData = await fetchSIDRASaneamento(ibge_code);
    console.log(`SIDRA Saneamento: ${Object.keys(sidraData).length} indicators`);

    // 4. Fetch Mapa do Turismo data (categoria, região turística)
    const mapaTurismoData = await fetchMapaTurismo(supabaseClient, ibge_code);
    console.log(`Mapa Turismo: ${Object.keys(mapaTurismoData).length} indicators`);

    // 5. Merge real data
    const realData: Record<string, IndicatorResult> = { ...agregadosData, ...pesquisasData, ...sidraData, ...mapaTurismoData };
    const realCount = Object.keys(realData).length;
    console.log(`Total real: ${realCount} indicators`);

    // 6. Fill gaps with manual-entry placeholders (NOT estimates)
    const existingKeys = new Set(Object.keys(realData));
    const defaults = generateDefaults(ibge_code, populacao, existingKeys);
    const allData: Record<string, IndicatorResult> = { ...defaults, ...realData };

    // 6. Build upsert payload
    const valuesToUpsert = Object.entries(allData)
      .filter(([code]) => {
        if (indicators && indicators.length > 0) return indicators.includes(code);
        return true;
      })
      .map(([code, result]) => ({
        indicator_code: code,
        municipality_ibge_code: ibge_code,
        source_code: result.source,
        raw_value: result.real ? result.value : null, // Non-real data gets null — operator must fill in
        reference_year: result.year || null,
        collection_method: result.real ? 'AUTOMATIC' : 'MANUAL',
        confidence_level: result.real ? 5 : 1,
        validated: false,
        org_id: org_id,
      }));

    // 7. Upsert
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

    const manualCount = valuesToUpsert.filter(v => v.collection_method === 'MANUAL').length;
    console.log(`Stored ${upsertedData?.length || 0} values (${realCount} real, ${manualCount} manual)`);

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
        message: `${realCount} indicadores obtidos de APIs oficiais. ${manualCount} indicadores requerem preenchimento manual.`,
        data: responseData,
        sources_used: [...new Set(valuesToUpsert.map(v => v.source_code))],
        real_count: realCount,
        manual_count: manualCount,
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
