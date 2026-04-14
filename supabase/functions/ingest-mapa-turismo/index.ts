import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAPA_API_BASE = 'https://www.mapa.turismo.gov.br/mapa/rest/publico';

const CKAN_BASE = 'https://dados.turismo.gov.br';

// Known CSV resources for Mapa do Turismo (by year) — FALLBACK
const MAPA_RESOURCES: Record<number, string> = {
  2017: '/pt_BR/dataset/569d8d6f-78df-46e9-88eb-009b4d033ada/resource/ce93dd47-aea9-44c2-b1ec-faf933bfb892/download/2017-mapa-turismo.csv',
  2016: '/pt_BR/dataset/569d8d6f-78df-46e9-88eb-009b4d033ada/resource/2363118f-0528-42e1-80c3-3bc161a37434/download/2016-mapa-turismo.csv',
  2013: '/pt_BR/dataset/569d8d6f-78df-46e9-88eb-009b4d033ada/resource/1f122bd3-1a65-46db-9707-4a9b4b7d0c1b/download/2013-mapa-turismo.csv',
};

const CATEG_RESOURCES: Record<number, string> = {
  2017: '/dataset/bc4166b3-a1ae-4d00-9e1a-05e9c4e1068d/resource/07c4f97a-888f-4ab7-ad2e-d5f040d627a0/download/2017-categorizacao-v2.csv',
  2014: '/dataset/bc4166b3-a1ae-4d00-9e1a-05e9c4e1068d/resource/0a960534-a1f0-4035-8b82-34bc724333e6/download/2016-categorizacao.csv',
};

interface ParsedRow {
  uf: string;
  regiao_turistica: string;
  municipio: string;
  categoria: string;
  ibge_code?: string;
  qt_emprego?: string;
  qt_estabelecimento?: string;
  qt_visita_internacional?: string;
  qt_visita_nacional?: string;
  arrecadacao?: number;
  fl_conselho?: boolean;
  no_instancia?: string;
}

// ─── REST API: Fetch directly from mapa.turismo.gov.br ───────────────
async function fetchFromMapaAPI(): Promise<{ rows: ParsedRow[]; source: string; year: number } | null> {
  console.log('Attempting to fetch from Mapa do Turismo REST API...');

  try {
    // 1. Get UF list
    const ufResp = await fetch(`${MAPA_API_BASE}/dne/listaUF`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!ufResp.ok) {
      console.error('Failed to fetch UF list:', ufResp.status);
      return null;
    }
    const ufList: any[] = await ufResp.json();
    console.log(`Got ${ufList.length} UFs`);

    // 2. Get summary to know the current year
    const resumoResp = await fetch(`${MAPA_API_BASE}/regionalizacao/resumo`, {
      headers: { 'Accept': 'application/json' },
    });
    let currentYear = new Date().getFullYear();
    if (resumoResp.ok) {
      const resumo = await resumoResp.json();
      currentYear = parseInt(resumo.ano) || currentYear;
      console.log(`Mapa do Turismo year: ${currentYear}, total municipalities: ${resumo.totalMunicipios}`);
    }

    // 3. Fetch all municipalities by searching per UF (API returns all at once too)
    const allRows: ParsedRow[] = [];

    // Try fetching all at once first
    const allResp = await fetch(`${MAPA_API_BASE}/regionalizacao/pesquisar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({}),
    });

    if (allResp.ok) {
      const data: any[] = await allResp.json();
      console.log(`Got ${data.length} municipalities from API`);

      for (const d of data) {
        const clusterMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C' };
        const categoria = clusterMap[d.coCluster] || '';

        allRows.push({
          uf: d.sgUf || '',
          regiao_turistica: d.noRegiaoTuristica || '',
          municipio: d.noMunicipio || '',
          categoria,
          ibge_code: d.nuMunicipioIbge || null,
          qt_emprego: d.qtEmprego || null,
          qt_estabelecimento: d.qtEstabelecimento || null,
          qt_visita_internacional: d.qtVisitaInternacionalEstimada || null,
          qt_visita_nacional: d.qtVisitaNacionalEstimada || null,
          arrecadacao: d.arrecadacao || null,
          fl_conselho: d.flSituacaoConselho || false,
          no_instancia: d.noInstancia || null,
        });
      }
    }

    if (allRows.length > 100) {
      console.log(`Successfully fetched ${allRows.length} from REST API`);
      return { rows: allRows, source: 'api:mapa.turismo.gov.br', year: currentYear };
    }

    // If bulk fetch didn't work, try per UF
    console.log('Bulk fetch yielded few results, trying per UF...');
    for (const uf of ufList) {
      try {
        const resp = await fetch(`${MAPA_API_BASE}/regionalizacao/pesquisar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ nuUf: uf.nuUf }),
        });

        if (!resp.ok) continue;
        const data: any[] = await resp.json();

        for (const d of data) {
          const clusterMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C' };
          const categoria = clusterMap[d.coCluster] || '';

          allRows.push({
            uf: d.sgUf || uf.sgUf || '',
            regiao_turistica: d.noRegiaoTuristica || '',
            municipio: d.noMunicipio || '',
            categoria,
            ibge_code: d.nuMunicipioIbge || null,
            qt_emprego: d.qtEmprego || null,
            qt_estabelecimento: d.qtEstabelecimento || null,
            qt_visita_internacional: d.qtVisitaInternacionalEstimada || null,
            qt_visita_nacional: d.qtVisitaNacionalEstimada || null,
            arrecadacao: d.arrecadacao || null,
            fl_conselho: d.flSituacaoConselho || false,
            no_instancia: d.noInstancia || null,
          });
        }

        // Small delay to be nice to the API
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.error(`Error fetching UF ${uf.sgUf}:`, e);
      }
    }

    if (allRows.length > 0) {
      console.log(`Fetched ${allRows.length} municipalities via per-UF requests`);
      return { rows: allRows, source: 'api:mapa.turismo.gov.br', year: currentYear };
    }

    return null;
  } catch (error) {
    console.error('REST API error:', error);
    return null;
  }
}

// ─── REST API: Fetch single municipality data ────────────────────────
async function fetchSingleMunicipio(nuUf: number, nuLocalidade: number): Promise<any | null> {
  try {
    const resp = await fetch(`${MAPA_API_BASE}/regionalizacao/pesquisar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ nuUf, nuLocalidade }),
    });
    if (!resp.ok) return null;
    const data: any[] = await resp.json();
    return data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

// ─── CSV parsing (for CKAN fallback) ─────────────────────────────────
function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(';').map(h => h.trim().toUpperCase());
  const ufIdx = header.findIndex(h => h === 'UF');
  const regiaoIdx = header.findIndex(h => h.includes('REGIAO') || h.includes('REGIÃO'));
  const munIdx = header.findIndex(h => h.includes('MUNICIPIO') || h.includes('MUNICÍPIO'));
  const catIdx = header.findIndex(h => h.includes('CATEGORIA') || h.includes('CATEG'));

  if (ufIdx === -1 || munIdx === -1) {
    console.error('CSV header not recognized:', header);
    return [];
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 3) continue;
    rows.push({
      uf: (cols[ufIdx] || '').trim(),
      regiao_turistica: regiaoIdx >= 0 ? (cols[regiaoIdx] || '').trim() : '',
      municipio: (cols[munIdx] || '').trim(),
      categoria: catIdx >= 0 ? (cols[catIdx] || '').trim() : '',
    });
  }
  return rows;
}

// ─── CKAN fallback ───────────────────────────────────────────────────
async function fetchFromCKAN(year: number, syncType: string): Promise<{ rows: ParsedRow[]; source: string }> {
  let csvUrl: string;
  if (syncType === 'categorizacao') {
    const path = CATEG_RESOURCES[year];
    if (!path) throw new Error(`Categorização not available for year ${year}. Available: ${Object.keys(CATEG_RESOURCES).join(', ')}`);
    csvUrl = `${CKAN_BASE}${path}`;
  } else {
    const path = MAPA_RESOURCES[year];
    if (!path) throw new Error(`Mapa do Turismo not available for year ${year}. Available: ${Object.keys(MAPA_RESOURCES).join(', ')}`);
    csvUrl = `${CKAN_BASE}${path}`;
  }

  console.log(`Fetching from CKAN: ${csvUrl}`);
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);

  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('iso-8859-1');
  const csvText = decoder.decode(buffer);
  const rows = parseCSV(csvText);

  if (rows.length === 0) throw new Error('No valid rows parsed from CSV');
  return { rows, source: `ckan:${csvUrl}` };
}

function inferMunicipalityType(categoria: string): string | null {
  const cat = categoria.toUpperCase().trim();
  if (['A', '1'].includes(cat)) return 'turistico';
  if (['B', '2'].includes(cat)) return 'complementar';
  if (['C', '3'].includes(cat)) return 'apoio';
  if (cat.includes('TURÍST') || cat.includes('TURIST')) return 'turistico';
  if (cat.includes('COMPLEMENT')) return 'complementar';
  if (cat.includes('APOIO')) return 'apoio';
  return null;
}

function ufToMacro(uf: string): string {
  const map: Record<string, string> = {
    AC: 'NORTE', AM: 'NORTE', AP: 'NORTE', PA: 'NORTE', RO: 'NORTE', RR: 'NORTE', TO: 'NORTE',
    AL: 'NORDESTE', BA: 'NORDESTE', CE: 'NORDESTE', MA: 'NORDESTE', PB: 'NORDESTE',
    PE: 'NORDESTE', PI: 'NORDESTE', RN: 'NORDESTE', SE: 'NORDESTE',
    DF: 'CENTRO-OESTE', GO: 'CENTRO-OESTE', MS: 'CENTRO-OESTE', MT: 'CENTRO-OESTE',
    ES: 'SUDESTE', MG: 'SUDESTE', RJ: 'SUDESTE', SP: 'SUDESTE',
    PR: 'SUL', RS: 'SUL', SC: 'SUL',
  };
  return map[uf.toUpperCase()] || 'DESCONHECIDO';
}

function parseNumericString(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const year = body.year || 2017;
    const syncType = body.sync_type || 'mapa_turismo';
    const useApi = body.use_api !== false; // default true — use REST API
    const useFirecrawl = body.use_firecrawl === true; // default false now
    const singleMunicipality = body.municipality; // optional: { nuUf, nuLocalidade }

    // Get user ID from JWT
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // ─── Single municipality lookup mode ─────────────────────────────
    if (singleMunicipality) {
      const data = await fetchSingleMunicipio(singleMunicipality.nuUf, singleMunicipality.nuLocalidade);
      if (!data) {
        return new Response(JSON.stringify({ success: false, error: 'Município não encontrado na API' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          municipio: data.noMunicipio,
          uf: data.sgUf,
          ibge_code: data.nuMunicipioIbge,
          regiao_turistica: data.noRegiaoTuristica,
          macrorregiao: data.noRegiao,
          categoria: ({ '1': 'A', '2': 'B', '3': 'C' } as Record<string, string>)[data.coCluster] || null,
          municipality_type: inferMunicipalityType(data.coCluster || ''),
          empregos_turismo: parseNumericString(data.qtEmprego),
          estabelecimentos_turismo: parseNumericString(data.qtEstabelecimento),
          visitantes_internacionais: parseNumericString(data.qtVisitaInternacionalEstimada),
          visitantes_nacionais: parseNumericString(data.qtVisitaNacionalEstimada),
          arrecadacao_turismo: data.arrecadacao,
          tem_conselho_turismo: data.flSituacaoConselho,
          nome_instancia: data.noInstancia,
          latitude: data.nuLatitude,
          longitude: data.nuLongitude,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Bulk import mode ────────────────────────────────────────────

    // Create sync log
    const { data: syncLog } = await supabase
      .from('mapa_turismo_sync_log')
      .insert({
        sync_type: syncType,
        ano_referencia: year,
        status: 'running',
        triggered_by: userId,
      })
      .select()
      .single();

    const logId = syncLog?.id;
    let dataSource = 'ckan';

    // Strategy: try REST API first, then CKAN fallback
    let result: { rows: ParsedRow[]; source: string };
    let recordYear = year;

    if (useApi) {
      const apiResult = await fetchFromMapaAPI();
      if (apiResult && apiResult.rows.length > 0) {
        result = apiResult;
        dataSource = 'api';
        recordYear = apiResult.year;
        console.log(`Using REST API data: ${result.rows.length} rows (year ${recordYear})`);
      } else {
        console.log('REST API yielded no data, falling back to CKAN...');
        result = await fetchFromCKAN(year, syncType);
        dataSource = 'ckan';
      }
    } else {
      result = await fetchFromCKAN(year, syncType);
    }

    const { rows } = result;
    console.log(`Total rows: ${rows.length} (source: ${dataSource})`);

    // Delete existing records for this year and source
    await supabase
      .from('mapa_turismo_municipios')
      .delete()
      .eq('ano_referencia', recordYear)
      .eq('fonte', result.source);

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
        municipio: row.municipio,
        uf: row.uf,
        ibge_code: row.ibge_code || null,
        regiao_turistica: row.regiao_turistica || null,
        macrorregiao: ufToMacro(row.uf),
        categoria: row.categoria || null,
        municipality_type: inferMunicipalityType(row.categoria),
        ano_referencia: recordYear,
        fonte: result.source,
        raw_data: {
          original_row: row,
          data_source: dataSource,
          qt_emprego: row.qt_emprego,
          qt_estabelecimento: row.qt_estabelecimento,
          qt_visita_internacional: row.qt_visita_internacional,
          qt_visita_nacional: row.qt_visita_nacional,
          arrecadacao: row.arrecadacao,
          fl_conselho: row.fl_conselho,
          no_instancia: row.no_instancia,
        },
      }));

      const { error } = await supabase
        .from('mapa_turismo_municipios')
        .insert(batch);

      if (error) {
        console.error(`Batch insert error at offset ${i}:`, error);
        throw error;
      }
      inserted += batch.length;
    }

    // Update sync log
    if (logId) {
      await supabase
        .from('mapa_turismo_sync_log')
        .update({
          status: 'success',
          records_processed: rows.length,
          records_inserted: inserted,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);
    }

    // Link to destinations
    const uniqueMunicipios = new Map<string, ParsedRow>();
    rows.forEach(r => {
      const key = `${r.municipio.toUpperCase()}|${r.uf.toUpperCase()}`;
      if (!uniqueMunicipios.has(key)) uniqueMunicipios.set(key, r);
    });

    const { data: destinations } = await supabase
      .from('destinations')
      .select('id, name, uf, municipality_type, tourism_region, ibge_code');

    let linkedCount = 0;
    if (destinations) {
      for (const dest of destinations) {
        // Match by name+UF or by IBGE code
        const key = `${(dest.name || '').toUpperCase()}|${(dest.uf || '').toUpperCase()}`;
        let match = uniqueMunicipios.get(key);

        if (!match && dest.ibge_code) {
          match = rows.find(r => r.ibge_code === dest.ibge_code) || undefined;
        }

        if (match) {
          const updates: Record<string, any> = {};
          if (match.regiao_turistica && !dest.tourism_region) updates.tourism_region = match.regiao_turistica;
          if (match.categoria && !dest.municipality_type) updates.municipality_type = inferMunicipalityType(match.categoria);
          if (match.ibge_code && !dest.ibge_code) updates.ibge_code = match.ibge_code;
          if (Object.keys(updates).length > 0) {
            await supabase.from('destinations').update(updates).eq('id', dest.id);
            linkedCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sync_type: syncType,
      year: recordYear,
      data_source: dataSource,
      source_detail: result.source,
      records_processed: rows.length,
      records_inserted: inserted,
      destinations_linked: linkedCount,
      available_years: syncType === 'categorizacao'
        ? Object.keys(CATEG_RESOURCES).map(Number)
        : Object.keys(MAPA_RESOURCES).map(Number),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Ingestion error:', error);

    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await supabaseAdmin
        .from('mapa_turismo_sync_log')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
        })
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1);
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
