import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CKAN_BASE = 'https://dados.turismo.gov.br';

// Known CSV resources for Mapa do Turismo (by year)
const MAPA_RESOURCES: Record<number, string> = {
  2017: '/pt_BR/dataset/569d8d6f-78df-46e9-88eb-009b4d033ada/resource/ce93dd47-aea9-44c2-b1ec-faf933bfb892/download/2017-mapa-turismo.csv',
  2016: '/pt_BR/dataset/569d8d6f-78df-46e9-88eb-009b4d033ada/resource/2363118f-0528-42e1-80c3-3bc161a37434/download/2016-mapa-turismo.csv',
  2013: '/pt_BR/dataset/569d8d6f-78df-46e9-88eb-009b4d033ada/resource/1f122bd3-1a65-46db-9707-4a9b4b7d0c1b/download/2013-mapa-turismo.csv',
};

// Categorização resources
const CATEG_RESOURCES: Record<number, string> = {
  2017: '/dataset/bc4166b3-a1ae-4d00-9e1a-05e9c4e1068d/resource/07c4f97a-888f-4ab7-ad2e-d5f040d627a0/download/2017-categorizacao-v2.csv',
  2014: '/dataset/bc4166b3-a1ae-4d00-9e1a-05e9c4e1068d/resource/0a960534-a1f0-4035-8b82-34bc724333e6/download/2016-categorizacao.csv',
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
    const year = body.year || 2017; // Default to most recent available
    const syncType = body.sync_type || 'mapa_turismo'; // 'mapa_turismo' or 'categorizacao'

    // Get user ID from JWT if available
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

    // Determine URL
    let csvUrl: string;
    if (syncType === 'categorizacao') {
      const path = CATEG_RESOURCES[year];
      if (!path) {
        throw new Error(`Categorização data not available for year ${year}. Available: ${Object.keys(CATEG_RESOURCES).join(', ')}`);
      }
      csvUrl = `${CKAN_BASE}${path}`;
    } else {
      const path = MAPA_RESOURCES[year];
      if (!path) {
        throw new Error(`Mapa do Turismo data not available for year ${year}. Available: ${Object.keys(MAPA_RESOURCES).join(', ')}`);
      }
      csvUrl = `${CKAN_BASE}${path}`;
    }

    console.log(`Fetching ${syncType} data for year ${year} from: ${csvUrl}`);

    // Fetch CSV
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }

    // Handle encoding (data is latin1/ISO-8859-1)
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1');
    const csvText = decoder.decode(buffer);

    // Parse
    const rows = parseCSV(csvText);
    console.log(`Parsed ${rows.length} rows`);

    if (rows.length === 0) {
      throw new Error('No valid rows parsed from CSV');
    }

    // Delete existing records for this year and sync_type
    await supabase
      .from('mapa_turismo_municipios')
      .delete()
      .eq('ano_referencia', year)
      .eq('fonte', `dados.turismo.gov.br/${syncType}`);

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
        ano_referencia: year,
        fonte: `dados.turismo.gov.br/${syncType}`,
        raw_data: { original_row: row },
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

    // Also update destinations table with tourism_region data
    // Match by municipality name + UF
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

    // Fetch destinations and try to match
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
          if (match.regiao && !dest.tourism_region) {
            updates.tourism_region = match.regiao;
          }
          if (match.type && !dest.municipality_type) {
            updates.municipality_type = match.type;
          }
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
      year,
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

    // Try to update sync log with error
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
