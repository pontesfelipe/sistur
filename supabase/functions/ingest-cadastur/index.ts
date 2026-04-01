import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known CADASTUR dataset URLs on dados.gov.br
// These change quarterly — we try multiple patterns
const CADASTUR_DATASETS = {
  guias: {
    indicator_code: 'igma_guias_turismo',
    // cadastur-01 = Guias de Turismo
    resource_urls: [
      'https://dados.gov.br/dados/conjuntos-dados/cadastur-01---guias-de-turismo',
    ],
    csv_patterns: [
      // Try recent quarters first (format: YYYY-QTR)
      'https://dados.gov.br/dados/conjuntos-dados/cadastur-01---guias-de-turismo',
    ],
  },
  agencias: {
    indicator_code: 'igma_agencias_turismo',
    // cadastur-03 = Agências de Turismo
    resource_urls: [
      'https://dados.gov.br/dados/conjuntos-dados/cadastur-03---agencias-de-turismo',
    ],
    csv_patterns: [],
  },
};

// Try to discover downloadable CSV/XLSX links from dados.gov.br CKAN API
async function discoverDownloadUrl(datasetSlug: string): Promise<string | null> {
  const apiUrl = `https://dados.gov.br/api/publico/conjuntos-dados/${datasetSlug}`;
  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) {
      console.warn(`CKAN API returned ${resp.status} for ${datasetSlug}`);
      return null;
    }
    const data = await resp.json();
    const resources = data?.recursos || data?.resources || [];
    
    // Sort by most recent, prefer CSV
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
      console.log(`Discovered URL for ${datasetSlug}: ${url}`);
      return url;
    }
    return null;
  } catch (e) {
    console.error(`Error discovering URL for ${datasetSlug}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// Parse CSV text and count entries per municipality (IBGE code)
function parseCSVAndAggregate(csvText: string, ibgeColumnNames: string[]): Record<string, number> {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return {};

  // Parse header
  const header = lines[0].split(';').map(h => h.trim().replace(/"/g, '').toLowerCase());
  
  // Find IBGE code column
  const ibgeColIndex = header.findIndex(h => 
    ibgeColumnNames.some(name => h.includes(name.toLowerCase()))
  );

  if (ibgeColIndex === -1) {
    // Try comma delimiter
    const headerComma = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    const ibgeColIndexComma = headerComma.findIndex(h =>
      ibgeColumnNames.some(name => h.includes(name.toLowerCase()))
    );
    
    if (ibgeColIndexComma === -1) {
      console.warn('Could not find IBGE column. Headers:', header.join(', '));
      return {};
    }
    
    // Re-parse with comma delimiter
    const counts: Record<string, number> = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      const code = cols[ibgeColIndexComma]?.replace(/\D/g, '');
      if (code && code.length >= 6) {
        const normalizedCode = code.length === 6 ? code : code.substring(0, 7);
        counts[normalizedCode] = (counts[normalizedCode] || 0) + 1;
      }
    }
    return counts;
  }

  // Parse with semicolon delimiter
  const counts: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map(c => c.trim().replace(/"/g, ''));
    const code = cols[ibgeColIndex]?.replace(/\D/g, '');
    if (code && code.length >= 6) {
      const normalizedCode = code.length === 6 ? code : code.substring(0, 7);
      counts[normalizedCode] = (counts[normalizedCode] || 0) + 1;
    }
  }
  return counts;
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
    }> = {};

    // Process each dataset
    for (const [key, dataset] of Object.entries(CADASTUR_DATASETS)) {
      const slug = key === 'guias' 
        ? 'cadastur-01---guias-de-turismo' 
        : 'cadastur-03---agencias-de-turismo';

      console.log(`\n--- Processing ${key} (${slug}) ---`);

      // 1. Try to discover download URL via CKAN API
      const downloadUrl = await discoverDownloadUrl(slug);

      if (!downloadUrl) {
        console.warn(`No download URL found for ${key}`);
        results[key] = { 
          status: 'unavailable', 
          error: 'Não foi possível localizar o arquivo CSV no portal dados.gov.br' 
        };

        // Store metadata about unavailability
        if (org_id) {
          await supabaseClient
            .from('external_data_sources')
            .upsert({
              code: `CADASTUR_${key.toUpperCase()}`,
              name: `CADASTUR - ${key === 'guias' ? 'Guias de Turismo' : 'Agências de Turismo'}`,
              description: `Dados do CADASTUR - Portal Dados Abertos. Última tentativa: ${new Date().toISOString()}. Status: indisponível`,
              update_frequency: 'TRIMESTRAL',
              trust_level_default: 4,
              active: true,
            }, { onConflict: 'code' });
        }
        continue;
      }

      // 2. Try to download the file
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

        const contentType = fileResp.headers.get('content-type') || '';
        const csvText = await fileResp.text();

        if (!csvText || csvText.length < 100) {
          results[key] = { status: 'unavailable', error: 'Arquivo vazio ou inválido' };
          continue;
        }

        console.log(`Downloaded ${csvText.length} bytes, content-type: ${contentType}`);

        // 3. Parse and aggregate by municipality
        const ibgeColumnNames = [
          'codigo_ibge', 'cod_ibge', 'ibge', 'codigo_municipio', 
          'cd_municipio', 'codmunicipio', 'municipio_ibge',
          'código_ibge', 'código do município',
        ];
        
        const countsByMunicipality = parseCSVAndAggregate(csvText, ibgeColumnNames);
        const municipalityCount = Object.keys(countsByMunicipality).length;

        console.log(`Parsed ${municipalityCount} municipalities from ${key}`);

        if (municipalityCount === 0) {
          results[key] = { 
            status: 'unavailable', 
            error: 'Não foi possível identificar coluna IBGE no CSV. Formato pode ter mudado.' 
          };
          continue;
        }

        // 4. Determine which municipalities to update
        let targetCodes: string[] = [];
        if (ibge_code) {
          targetCodes = [ibge_code];
        } else if (org_id) {
          // Get all destinations for this org
          const { data: destinations } = await supabaseClient
            .from('destinations')
            .select('ibge_code')
            .eq('org_id', org_id)
            .not('ibge_code', 'is', null);
          targetCodes = (destinations || []).map(d => d.ibge_code!).filter(Boolean);
        } else {
          // For scheduled runs, update all known municipalities
          const { data: allDests } = await supabaseClient
            .from('destinations')
            .select('ibge_code, org_id')
            .not('ibge_code', 'is', null);
          targetCodes = [...new Set((allDests || []).map(d => d.ibge_code!).filter(Boolean))];
        }

        // 5. Upsert values for target municipalities
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
        let upsertCount = 0;

        for (const code of targetCodes) {
          // Try both 7-digit and 6-digit codes
          const value = countsByMunicipality[code] || countsByMunicipality[code.substring(0, 6)] || 0;
          
          // Get org_id for this destination
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

          const { error: upsertError } = await supabaseClient
            .from('external_indicator_values')
            .upsert({
              indicator_code: dataset.indicator_code,
              municipality_ibge_code: code,
              source_code: 'CADASTUR',
              raw_value: value,
              reference_year: currentYear,
              collection_method: 'BATCH',
              confidence_level: value > 0 ? 4 : 2,
              validated: false,
              org_id: destOrgId,
              notes: `CADASTUR ${currentYear} Q${currentQuarter}. ${value > 0 ? `${value} registros encontrados.` : 'Município não encontrado no dataset — pode não ter registros.'}`,
            }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });

          if (upsertError) {
            console.error(`Upsert error for ${code}:`, upsertError.message);
          } else {
            upsertCount++;
          }
        }

        // Update data source metadata
        await supabaseClient
          .from('external_data_sources')
          .upsert({
            code: `CADASTUR_${key.toUpperCase()}`,
            name: `CADASTUR - ${key === 'guias' ? 'Guias de Turismo' : 'Agências de Turismo'}`,
            description: `Dados do CADASTUR via Portal Dados Abertos. Última atualização: ${new Date().toISOString()}. ${municipalityCount} municípios no dataset.`,
            update_frequency: 'TRIMESTRAL',
            trust_level_default: 4,
            active: true,
          }, { onConflict: 'code' });

        results[key] = { 
          status: 'success', 
          count: upsertCount,
          url: downloadUrl,
          quarter: `${currentYear}-Q${currentQuarter}`,
        };

        console.log(`✓ ${key}: ${upsertCount} municipalities updated`);

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
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
