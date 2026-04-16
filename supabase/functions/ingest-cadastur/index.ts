import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dataset slug → CKAN slug mapping
const DATASET_SLUGS: Record<string, string> = {
  guias: 'cadastur-01---guias-de-turismo',
  hospedagem: 'cadastur-02---meios-de-hospedagem',
  agencias: 'cadastur-03---agencias-de-turismo',
};

// Dataset slug → human-readable label
const DATASET_LABELS: Record<string, string> = {
  guias: 'Guias de Turismo',
  hospedagem: 'Meios de Hospedagem',
  agencias: 'Agências de Turismo',
};

// Each dataset can feed multiple indicators
interface DatasetIndicator {
  indicator_code: string;
  // 'count' = count rows per municipality (default)
  // 'sum_column' = sum a numeric column per municipality
  aggregation: 'count' | 'sum_column';
  // Column names to look for when aggregation is 'sum_column'
  sum_column_names?: string[];
}

const CADASTUR_DATASETS: Record<string, DatasetIndicator[]> = {
  guias: [
    { indicator_code: 'igma_guias_turismo', aggregation: 'count' },
  ],
  hospedagem: [
    // Count of accommodation establishments
    { indicator_code: 'igma_meios_hospedagem', aggregation: 'count' },
    // Sum of beds/capacity if column exists, otherwise fall back to count
    {
      indicator_code: 'OE001',
      aggregation: 'sum_column',
      sum_column_names: [
        'leitos', 'qtd_leitos', 'quantidade_leitos', 'capacidade',
        'num_leitos', 'total_leitos', 'qtde_leitos', 'nro_leitos',
        'numero_leitos', 'qt_leitos', 'unidades_habitacionais', 'uhs',
      ],
    },
  ],
  agencias: [
    { indicator_code: 'igma_agencias_turismo', aggregation: 'count' },
  ],
};

// IBGE column detection names
const IBGE_COLUMN_NAMES = [
  'codigo_ibge', 'cod_ibge', 'ibge', 'codigo_municipio',
  'cd_municipio', 'codmunicipio', 'municipio_ibge',
  'código_ibge', 'código do município',
];

// ─── CSV Discovery ──────────────────────────────────────────────────

async function discoverDownloadUrl(datasetSlug: string): Promise<string | null> {
  const ckanUrl = await discoverViaCKAN(datasetSlug);
  if (ckanUrl) return ckanUrl;
  const firecrawlUrl = await discoverViaFirecrawl(datasetSlug);
  if (firecrawlUrl) return firecrawlUrl;
  return null;
}

async function discoverViaCKAN(datasetSlug: string): Promise<string | null> {
  const apiUrl = `https://dados.gov.br/api/publico/conjuntos-dados/${datasetSlug}`;
  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) {
      console.warn(`CKAN API returned ${resp.status} for ${datasetSlug}`);
      return null;
    }
    const data = await resp.json();
    const resources = data?.recursos || data?.resources || [];

    const sorted = resources
      .filter((r: any) => {
        const fmt = (r.formato || r.format || '').toUpperCase();
        return fmt === 'CSV' || fmt === 'XLS' || fmt === 'XLSX';
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.data_ultima_atualizacao || a.last_modified || 0);
        const dateB = new Date(b.data_ultima_atualizacao || b.last_modified || 0);
        return dateB.getTime() - dateA.getTime();
      });

    if (sorted.length > 0) {
      const url = sorted[0].link || sorted[0].url;
      console.log(`[CKAN] Discovered URL for ${datasetSlug}: ${url}`);
      return url;
    }
    return null;
  } catch (e) {
    console.error(`[CKAN] Error for ${datasetSlug}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

async function discoverViaFirecrawl(datasetSlug: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.log('[Firecrawl] API key not configured, skipping fallback');
    return null;
  }

  const pageUrl = `https://dados.gov.br/dados/conjuntos-dados/${datasetSlug}`;
  console.log(`[Firecrawl] Scraping ${pageUrl} for download links...`);

  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: pageUrl,
        formats: ['links', 'markdown'],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    if (!resp.ok) {
      console.warn(`[Firecrawl] API returned ${resp.status}`);
      return null;
    }

    const result = await resp.json();
    const links: string[] = result?.data?.links || result?.links || [];
    const markdown: string = result?.data?.markdown || result?.markdown || '';

    const downloadLinks = links.filter((link: string) => {
      const lower = link.toLowerCase();
      return (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls'))
        && (lower.includes('cadastur') || lower.includes('dados.gov') || lower.includes('turismo'));
    });

    if (downloadLinks.length > 0) {
      downloadLinks.sort((a, b) => b.localeCompare(a));
      console.log(`[Firecrawl] Found ${downloadLinks.length} download links, using: ${downloadLinks[0]}`);
      return downloadLinks[0];
    }

    const urlRegex = /https?:\/\/[^\s)]+\.(csv|xlsx|xls)/gi;
    const markdownUrls = markdown.match(urlRegex) || [];
    const relevantUrls = markdownUrls.filter((u: string) =>
      u.toLowerCase().includes('cadastur') || u.toLowerCase().includes('turismo')
    );

    if (relevantUrls.length > 0) {
      relevantUrls.sort((a: string, b: string) => b.localeCompare(a));
      console.log(`[Firecrawl] Found URL in markdown: ${relevantUrls[0]}`);
      return relevantUrls[0];
    }

    console.log('[Firecrawl] No download links found on page');
    return null;
  } catch (e) {
    console.error('[Firecrawl] Error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ─── CSV Parsing ────────────────────────────────────────────────────

function detectDelimiter(headerLine: string): string {
  return headerLine.split(';').length > headerLine.split(',').length ? ';' : ',';
}

function parseLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map(c => c.trim().replace(/"/g, ''));
}

/**
 * Parse CSV and aggregate values per municipality.
 * - aggregation 'count': count rows per IBGE code
 * - aggregation 'sum_column': sum a numeric column per IBGE code (falls back to count if column not found)
 */
function parseCSVAndAggregate(
  csvText: string,
  aggregation: 'count' | 'sum_column',
  sumColumnNames?: string[],
): { counts: Record<string, number>; usedSumColumn: boolean; detectedHeaders?: string[] } {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { counts: {}, usedSumColumn: false };

  const delimiter = detectDelimiter(lines[0]);
  const header = parseLine(lines[0], delimiter).map(h => h.toLowerCase());

  // Find IBGE column
  const ibgeColIndex = header.findIndex(h =>
    IBGE_COLUMN_NAMES.some(name => h.includes(name.toLowerCase()))
  );

  if (ibgeColIndex === -1) {
    console.warn('Could not find IBGE column. Headers:', header.join(', '));
    return { counts: {}, usedSumColumn: false, detectedHeaders: header };
  }

  // Find sum column (if applicable)
  let sumColIndex = -1;
  let usedSumColumn = false;
  if (aggregation === 'sum_column' && sumColumnNames?.length) {
    sumColIndex = header.findIndex(h =>
      sumColumnNames.some(name => h.includes(name.toLowerCase()))
    );
    if (sumColIndex !== -1) {
      usedSumColumn = true;
      console.log(`Found sum column "${header[sumColIndex]}" at index ${sumColIndex}`);
    } else {
      console.log(`Sum column not found (tried: ${sumColumnNames.join(', ')}). Falling back to row count.`);
    }
  }

  const counts: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], delimiter);
    const code = cols[ibgeColIndex]?.replace(/\D/g, '');
    if (!code || code.length < 6) continue;

    const normalizedCode = code.length === 6 ? code : code.substring(0, 7);

    if (usedSumColumn && sumColIndex !== -1) {
      const rawVal = cols[sumColIndex]?.replace(/[^\d.,]/g, '').replace(',', '.');
      const numVal = parseFloat(rawVal);
      counts[normalizedCode] = (counts[normalizedCode] || 0) + (isNaN(numVal) ? 0 : numVal);
    } else {
      counts[normalizedCode] = (counts[normalizedCode] || 0) + 1;
    }
  }

  return { counts, usedSumColumn, detectedHeaders: header };
}

// ─── Main handler ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Allow empty body for scheduled invocations
    }

    const { org_id, ibge_code, force_refresh } = body;

    console.log('=== CADASTUR Ingestion Start ===');
    console.log(`org_id: ${org_id || 'all'}, ibge_code: ${ibge_code || 'all'}, force: ${force_refresh || false}`);

    const results: Record<string, {
      status: 'success' | 'unavailable' | 'error';
      count?: number;
      url?: string;
      error?: string;
      quarter?: string;
      indicators?: string[];
    }> = {};

    // Process each dataset
    for (const [key, indicators] of Object.entries(CADASTUR_DATASETS)) {
      const slug = DATASET_SLUGS[key];
      const label = DATASET_LABELS[key];

      console.log(`\n--- Processing ${key} (${slug}) ---`);

      // 1. Discover download URL
      const downloadUrl = await discoverDownloadUrl(slug);

      if (!downloadUrl) {
        console.warn(`No download URL found for ${key}`);
        results[key] = {
          status: 'unavailable',
          error: 'Não foi possível localizar o arquivo CSV no portal dados.gov.br',
        };

        if (org_id) {
          await supabaseClient
            .from('external_data_sources')
            .upsert({
              code: `CADASTUR_${key.toUpperCase()}`,
              name: `CADASTUR - ${label}`,
              description: `Dados do CADASTUR - Portal Dados Abertos. Última tentativa: ${new Date().toISOString()}. Status: indisponível`,
              update_frequency: 'TRIMESTRAL',
              trust_level_default: 4,
              active: true,
            }, { onConflict: 'code' });
        }
        continue;
      }

      // 2. Download file
      try {
        console.log(`Downloading: ${downloadUrl}`);
        const fileResp = await fetch(downloadUrl, {
          signal: AbortSignal.timeout(30000),
          headers: { 'Accept': 'text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        });

        if (!fileResp.ok) {
          console.error(`Download failed: ${fileResp.status}`);
          results[key] = {
            status: 'unavailable',
            error: `Download falhou (HTTP ${fileResp.status})`,
            url: downloadUrl,
          };
          continue;
        }

        const csvText = await fileResp.text();

        if (!csvText || csvText.length < 100) {
          results[key] = { status: 'unavailable', error: 'Arquivo vazio ou inválido' };
          continue;
        }

        console.log(`Downloaded ${csvText.length} bytes`);

        // 3. Determine target municipalities
        let targetCodes: string[] = [];
        if (ibge_code) {
          targetCodes = [ibge_code];
        } else if (org_id) {
          const { data: destinations } = await supabaseClient
            .from('destinations')
            .select('ibge_code')
            .eq('org_id', org_id)
            .not('ibge_code', 'is', null);
          targetCodes = (destinations || []).map(d => d.ibge_code!).filter(Boolean);
        } else {
          const { data: allDests } = await supabaseClient
            .from('destinations')
            .select('ibge_code, org_id')
            .not('ibge_code', 'is', null);
          targetCodes = [...new Set((allDests || []).map(d => d.ibge_code!).filter(Boolean))];
        }

        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
        let totalUpserts = 0;
        const processedIndicators: string[] = [];

        // 4. Process each indicator for this dataset
        for (const ind of indicators) {
          const { counts: countsByMunicipality, usedSumColumn } = parseCSVAndAggregate(
            csvText,
            ind.aggregation,
            ind.sum_column_names,
          );

          const municipalityCount = Object.keys(countsByMunicipality).length;
          const aggregationLabel = usedSumColumn ? 'soma de coluna' : 'contagem de registros';
          console.log(`  → ${ind.indicator_code}: ${municipalityCount} municípios (${aggregationLabel})`);

          if (municipalityCount === 0) {
            console.warn(`  ⚠ Nenhum município encontrado para ${ind.indicator_code}`);
            continue;
          }

          processedIndicators.push(ind.indicator_code);

          // 5. Upsert values
          for (const code of targetCodes) {
            const value = countsByMunicipality[code] || countsByMunicipality[code.substring(0, 6)] || 0;

            let destOrgId = org_id;
            if (!destOrgId) {
              const { data: dest } = await supabaseClient
                .from('destinations')
                .select('org_id')
                .eq('ibge_code', code)
                .limit(1)
                .single();
              destOrgId = dest?.org_id;
            }

            if (!destOrgId) continue;

            const noteDetail = usedSumColumn
              ? `${value} leitos encontrados`
              : `${value} registros encontrados`;

            const { error: upsertError } = await supabaseClient
              .from('external_indicator_values')
              .upsert({
                indicator_code: ind.indicator_code,
                municipality_ibge_code: code,
                source_code: 'CADASTUR',
                raw_value: value,
                reference_year: currentYear,
                collection_method: 'BATCH',
                confidence_level: value > 0 ? 4 : 2,
                validated: false,
                org_id: destOrgId,
                notes: `CADASTUR ${currentYear} Q${currentQuarter}. ${value > 0 ? noteDetail + '.' : 'Município não encontrado no dataset — pode não ter registros.'}`,
              }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });

            if (upsertError) {
              console.error(`Upsert error for ${code}/${ind.indicator_code}:`, upsertError.message);
            } else {
              totalUpserts++;
            }
          }
        }

        // Update data source metadata
        await supabaseClient
          .from('external_data_sources')
          .upsert({
            code: `CADASTUR_${key.toUpperCase()}`,
            name: `CADASTUR - ${label}`,
            description: `Dados do CADASTUR via Portal Dados Abertos. Última atualização: ${new Date().toISOString()}. Indicadores: ${processedIndicators.join(', ')}.`,
            update_frequency: 'TRIMESTRAL',
            trust_level_default: 4,
            active: true,
          }, { onConflict: 'code' });

        results[key] = {
          status: 'success',
          count: totalUpserts,
          url: downloadUrl,
          quarter: `${currentYear}-Q${currentQuarter}`,
          indicators: processedIndicators,
        };

        console.log(`✓ ${key}: ${totalUpserts} upserts across ${processedIndicators.length} indicators`);

      } catch (e) {
        console.error(`Error processing ${key}:`, e instanceof Error ? e.message : e);
        results[key] = {
          status: 'error',
          error: e instanceof Error ? e.message : 'Erro desconhecido',
          url: downloadUrl,
        };
      }
    }

    console.log('\n=== CADASTUR Ingestion Complete ===');
    console.log(JSON.stringify(results, null, 2));

    const successCount = Object.values(results).filter(r => r.status === 'success').length;
    const unavailableCount = Object.values(results).filter(r => r.status === 'unavailable').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `CADASTUR: ${successCount} datasets processados, ${unavailableCount} indisponíveis.`,
        results,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest-cadastur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
