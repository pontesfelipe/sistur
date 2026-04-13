import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Firecrawl target URLs for scraping current data
const FIRECRAWL_TARGETS = {
  mapa_turismo: 'https://www.mapa.turismo.gov.br/mapa/init.html#/home',
  dados_abertos: 'https://dados.turismo.gov.br/dataset/mapa-do-turismo',
  categorizacao: 'https://dados.turismo.gov.br/dataset/categorizacao-dos-municipios',
};

interface ParsedRow {
  uf: string;
  regiao_turistica: string;
  municipio: string;
  categoria: string;
}

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

// Parse markdown/HTML scraped by Firecrawl into structured rows
function parseScrapedContent(markdown: string): ParsedRow[] {
  const rows: ParsedRow[] = [];

  // Try table format (markdown tables)
  const tableLines = markdown.split('\n').filter(l => l.includes('|'));
  if (tableLines.length > 2) {
    const headerLine = tableLines[0];
    const headers = headerLine.split('|').map(h => h.trim().toUpperCase());
    
    const ufIdx = headers.findIndex(h => h === 'UF' || h === 'ESTADO');
    const munIdx = headers.findIndex(h => h.includes('MUNIC') || h.includes('CIDADE'));
    const regiaoIdx = headers.findIndex(h => h.includes('REGI') || h.includes('TURÍS'));
    const catIdx = headers.findIndex(h => h.includes('CATEG') || h.includes('CLASS'));

    if (ufIdx >= 0 && munIdx >= 0) {
      for (let i = 2; i < tableLines.length; i++) {
        const cols = tableLines[i].split('|').map(c => c.trim());
        if (cols.length < 3) continue;
        const uf = cols[ufIdx] || '';
        const mun = cols[munIdx] || '';
        if (uf.length === 2 && mun.length > 1) {
          rows.push({
            uf,
            municipio: mun,
            regiao_turistica: regiaoIdx >= 0 ? (cols[regiaoIdx] || '') : '',
            categoria: catIdx >= 0 ? (cols[catIdx] || '') : '',
          });
        }
      }
    }
  }

  // Also try line-based patterns: "MUNICIPIO - UF - REGIAO"
  if (rows.length === 0) {
    const linePatterns = [
      /([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+)\s*[-–]\s*([A-Z]{2})\s*[-–]\s*(.+?)(?:\s*[-–]\s*([A-E]))?$/gm,
      /([A-Z]{2})\s*[,;]\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+)\s*[,;]\s*(.+?)(?:\s*[,;]\s*([A-E]))?$/gm,
    ];

    for (const pattern of linePatterns) {
      let match;
      while ((match = pattern.exec(markdown)) !== null) {
        if (match[1].length === 2) {
          rows.push({
            uf: match[1].trim(),
            municipio: match[2].trim(),
            regiao_turistica: match[3]?.trim() || '',
            categoria: match[4]?.trim() || '',
          });
        } else {
          rows.push({
            municipio: match[1].trim(),
            uf: match[2].trim(),
            regiao_turistica: match[3]?.trim() || '',
            categoria: match[4]?.trim() || '',
          });
        }
      }
      if (rows.length > 0) break;
    }
  }

  return rows;
}

// Try Firecrawl scraping first
async function tryFirecrawlScrape(syncType: string): Promise<{ rows: ParsedRow[]; source: string } | null> {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlKey) {
    console.log('FIRECRAWL_API_KEY not available, skipping scraping');
    return null;
  }

  const targetUrl = syncType === 'categorizacao'
    ? FIRECRAWL_TARGETS.categorizacao
    : FIRECRAWL_TARGETS.dados_abertos;

  console.log(`Attempting Firecrawl scrape: ${targetUrl}`);

  try {
    // First, map the site to find CSV/data download links
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        search: 'download csv mapa turismo municipio',
        limit: 50,
      }),
    });

    if (!mapResponse.ok) {
      console.error('Firecrawl map failed:', mapResponse.status);
      await mapResponse.text();
      return null;
    }

    const mapData = await mapResponse.json();
    const links: string[] = mapData?.links || [];
    console.log(`Firecrawl found ${links.length} links`);

    // Look for CSV download links
    const csvLinks = links.filter(l =>
      l.match(/\.(csv|xlsx?)$/i) ||
      l.includes('download') ||
      l.includes('resource')
    );

    // Try to download CSVs found via Firecrawl
    for (const csvLink of csvLinks.slice(0, 5)) {
      console.log(`Trying CSV link: ${csvLink}`);
      try {
        const csvResponse = await fetch(csvLink);
        if (!csvResponse.ok) {
          await csvResponse.text();
          continue;
        }

        const buffer = await csvResponse.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const csvText = decoder.decode(buffer);
        const rows = parseCSV(csvText);

        if (rows.length > 10) {
          console.log(`Successfully parsed ${rows.length} rows from Firecrawl-discovered CSV`);
          return { rows, source: `firecrawl:${csvLink}` };
        }
      } catch (e) {
        console.error(`Failed to fetch CSV ${csvLink}:`, e);
      }
    }

    // Fallback: scrape the page content directly
    console.log('No CSV links found, scraping page content...');
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: FIRECRAWL_TARGETS.mapa_turismo,
        formats: ['markdown'],
        waitFor: 5000,
      }),
    });

    if (!scrapeResponse.ok) {
      console.error('Firecrawl scrape failed:', scrapeResponse.status);
      await scrapeResponse.text();
      return null;
    }

    const scrapeData = await scrapeResponse.json();
    const md = scrapeData?.data?.markdown || scrapeData?.markdown || '';

    if (md.length > 100) {
      const rows = parseScrapedContent(md);
      if (rows.length > 10) {
        console.log(`Parsed ${rows.length} rows from scraped content`);
        return { rows, source: 'firecrawl:scrape' };
      }
    }

    // Try searching for more recent data
    console.log('Searching for latest data via Firecrawl...');
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'mapa turismo brasileiro municipios categorizacao 2024 2025 csv download site:dados.turismo.gov.br OR site:dados.gov.br',
        limit: 10,
        scrapeOptions: { formats: ['markdown', 'links'] },
      }),
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const results = searchData?.data || [];

      for (const result of results) {
        // Check for CSV links in search results
        const resultLinks: string[] = result?.links || [];
        const csvFound = resultLinks.filter((l: string) => l.match(/\.(csv)$/i));

        for (const csv of csvFound.slice(0, 3)) {
          try {
            const r = await fetch(csv);
            if (!r.ok) { await r.text(); continue; }
            const buf = await r.arrayBuffer();
            const txt = new TextDecoder('iso-8859-1').decode(buf);
            const rows = parseCSV(txt);
            if (rows.length > 10) {
              console.log(`Found ${rows.length} rows from search result CSV: ${csv}`);
              return { rows, source: `firecrawl:search:${csv}` };
            }
          } catch (_) { /* skip */ }
        }
      }
    } else {
      await searchResponse.text();
    }

    console.log('Firecrawl did not yield usable data');
    return null;
  } catch (error) {
    console.error('Firecrawl error:', error);
    return null;
  }
}

// Fallback: fetch from CKAN static CSVs
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
  if (['A', 'B'].includes(cat)) return 'turistico';
  if (['C', 'D'].includes(cat)) return 'complementar';
  if (cat === 'E') return 'apoio';
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
    const useFirecrawl = body.use_firecrawl !== false; // default true

    // Get user ID from JWT
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

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

    // Strategy: try Firecrawl first, then CKAN fallback
    let result: { rows: ParsedRow[]; source: string };

    if (useFirecrawl) {
      const firecrawlResult = await tryFirecrawlScrape(syncType);
      if (firecrawlResult && firecrawlResult.rows.length > 0) {
        result = firecrawlResult;
        dataSource = 'firecrawl';
        console.log(`Using Firecrawl data: ${result.rows.length} rows from ${result.source}`);
      } else {
        console.log('Firecrawl yielded no data, falling back to CKAN...');
        result = await fetchFromCKAN(year, syncType);
        dataSource = 'ckan';
      }
    } else {
      result = await fetchFromCKAN(year, syncType);
    }

    const { rows } = result;
    console.log(`Total rows: ${rows.length} (source: ${dataSource})`);

    // Determine year for the records
    const recordYear = dataSource === 'firecrawl' ? new Date().getFullYear() : year;

    // Delete existing records for this year and source type
    await supabase
      .from('mapa_turismo_municipios')
      .delete()
      .eq('ano_referencia', recordYear)
      .eq('fonte', result.source.startsWith('firecrawl') ? result.source : `dados.turismo.gov.br/${syncType}`);

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
        municipio: row.municipio,
        uf: row.uf,
        regiao_turistica: row.regiao_turistica || null,
        macrorregiao: ufToMacro(row.uf),
        categoria: row.categoria || null,
        municipality_type: inferMunicipalityType(row.categoria),
        ano_referencia: recordYear,
        fonte: result.source.startsWith('firecrawl') ? result.source : `dados.turismo.gov.br/${syncType}`,
        raw_data: { original_row: row, data_source: dataSource },
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
    const uniqueRegions = new Map<string, { regiao: string; type: string | null }>();
    rows.forEach(r => {
      const key = `${r.municipio.toUpperCase()}|${r.uf.toUpperCase()}`;
      if (!uniqueRegions.has(key)) {
        uniqueRegions.set(key, {
          regiao: r.regiao_turistica,
          type: inferMunicipalityType(r.categoria),
        });
      }
    });

    const { data: destinations } = await supabase
      .from('destinations')
      .select('id, name, uf, municipality_type, tourism_region');

    let linkedCount = 0;
    if (destinations) {
      for (const dest of destinations) {
        const key = `${(dest.name || '').toUpperCase()}|${(dest.uf || '').toUpperCase()}`;
        const match = uniqueRegions.get(key);
        if (match) {
          const updates: Record<string, any> = {};
          if (match.regiao && !dest.tourism_region) updates.tourism_region = match.regiao;
          if (match.type && !dest.municipality_type) updates.municipality_type = match.type;
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
