// Edge function: ingest-tse
// Busca comparecimento eleitoral por município via Firecrawl (proxy de scraping).
//
// Fonte primária: páginas de "estatísticas eleitorais" do TSE indexadas pelo
// município. Como o portal oficial do TSE usa SPA com hash routing (difícil
// de scrapear de forma confiável), usamos páginas agregadoras que republicam
// o dado oficial e são amigáveis a scraping (G1/Globo Eleições, que sindica
// dados oficiais do TSE por município).
//
// Resultado: indicador MST_TSE_TURNOUT preenchido automaticamente com o
// % de comparecimento do último pleito disponível.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  ibge_code: string;
  org_id?: string;
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

async function firecrawlScrape(url: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });
    if (!response.ok) {
      console.error(`Firecrawl ${response.status}:`, await response.text());
      return null;
    }
    const data = await response.json();
    return data?.data?.markdown || data?.markdown || null;
  } catch (err) {
    console.error('Firecrawl scrape error:', err);
    return null;
  }
}

// Try to extract turnout % from scraped markdown.
// Looks for patterns like "comparecimento", "abstenção", "78,5%", etc.
function extractTurnoutPct(markdown: string): { value: number; year: number } | null {
  if (!markdown) return null;

  // Try to detect the election year from context (2024 municipal, 2022 general)
  let year = 2024;
  if (/elei(ç|c)(ã|a)o\s+(municipal\s+)?(de\s+)?2024/i.test(markdown)) year = 2024;
  else if (/elei(ç|c)(ã|a)o\s+(geral\s+)?(de\s+)?2022/i.test(markdown)) year = 2022;
  else if (/2020/.test(markdown)) year = 2020;

  // Pattern A: "Comparecimento: 78,52%" or "comparecimento de 78,52%"
  const patterns = [
    /comparecimento[^0-9]{0,30}(\d{1,3}[,.]\d{1,2})\s*%/i,
    /(\d{1,3}[,.]\d{1,2})\s*%\s*(?:de\s+)?comparecimento/i,
    /participa(ç|c)(ã|a)o[^0-9]{0,30}(\d{1,3}[,.]\d{1,2})\s*%/i,
  ];

  for (const re of patterns) {
    const m = markdown.match(re);
    if (m) {
      const numStr = (m[3] || m[1] || '').replace(',', '.');
      const v = parseFloat(numStr);
      if (!isNaN(v) && v > 0 && v <= 100) return { value: v, year };
    }
  }

  // Pattern B: derive from abstention "abstenção: 21,48%"
  const absMatch = markdown.match(/absten(ç|c)(ã|a)o[^0-9]{0,30}(\d{1,3}[,.]\d{1,2})\s*%/i);
  if (absMatch) {
    const abs = parseFloat(absMatch[3].replace(',', '.'));
    if (!isNaN(abs) && abs >= 0 && abs <= 100) return { value: 100 - abs, year };
  }

  return null;
}

async function fetchMunicipalityName(supabase: ReturnType<typeof createClient>, ibge: string): Promise<{ name: string; uf: string } | null> {
  const { data } = await supabase
    .from('destinations')
    .select('name, uf')
    .eq('ibge_code', ibge)
    .limit(1)
    .maybeSingle();
  if (data?.name) return { name: data.name, uf: data.uf || '' };

  // Fallback: IBGE API
  try {
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${ibge}`);
    if (r.ok) {
      const j = await r.json();
      return { name: j?.nome || '', uf: j?.microrregiao?.mesorregiao?.UF?.sigla || '' };
    }
  } catch (err) {
    console.error('IBGE lookup error:', err);
  }
  return null;
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

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const muni = await fetchMunicipalityName(supabase, body.ibge_code);
    const sourceTseUrl = 'https://www.tse.jus.br/eleicoes/estatisticas/estatisticas-eleitorais';

    let extractedValue: number | null = null;
    let extractedYear: number | null = null;
    let scrapeUrl: string | null = null;
    let scrapeStatus: 'success' | 'no_data' | 'no_firecrawl' | 'no_municipality' = 'no_data';

    if (!firecrawlKey) {
      scrapeStatus = 'no_firecrawl';
    } else if (!muni?.name) {
      scrapeStatus = 'no_municipality';
    } else {
      // Build candidate URLs to scrape (G1 Eleições: stable per-municipality pages)
      const slug = muni.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const uf = (muni.uf || '').toLowerCase();

      const candidates: string[] = [];
      if (uf) {
        // G1 2024 municipal
        candidates.push(`https://g1.globo.com/${uf}/${uf}/eleicoes/2024/apuracao/${uf}/${slug}.ghtml`);
        // G1 2022 general (state aggregate per municipality, presidential turnout)
        candidates.push(`https://g1.globo.com/${uf}/${uf}/eleicoes/2022/apuracao/${slug}.ghtml`);
      }

      for (const url of candidates) {
        const md = await firecrawlScrape(url, firecrawlKey);
        if (md) {
          const extracted = extractTurnoutPct(md);
          if (extracted) {
            extractedValue = extracted.value;
            extractedYear = extracted.year;
            scrapeUrl = url;
            scrapeStatus = 'success';
            break;
          }
        }
      }
    }

    const note = extractedValue !== null
      ? `Comparecimento eleitoral ${extractedYear} (TSE via ${scrapeUrl}). Atualize manualmente se necessário.`
      : `🌀 MST — Comparecimento eleitoral. Não foi possível extrair automaticamente. Consulte ${sourceTseUrl} e informe o percentual.`;

    let upserted = false;
    if (body.org_id) {
      const { data: existing } = await supabase
        .from('external_indicator_values')
        .select('id, raw_value, validated, collection_method')
        .eq('org_id', body.org_id)
        .eq('municipality_ibge_code', body.ibge_code)
        .eq('indicator_code', 'MST_TSE_TURNOUT')
        .maybeSingle();

      // Upsert if no validated manual value exists, or if we have new automatic data
      const shouldWrite = !existing
        || existing.raw_value === null
        || (extractedValue !== null && !existing.validated);

      if (shouldWrite) {
        const { error: upsertError } = await supabase
          .from('external_indicator_values')
          .upsert({
            indicator_code: 'MST_TSE_TURNOUT',
            municipality_ibge_code: body.ibge_code,
            source_code: 'TSE',
            raw_value: extractedValue,
            reference_year: extractedYear,
            collection_method: extractedValue !== null ? ('AUTOMATIC' as const) : ('MANUAL' as const),
            confidence_level: extractedValue !== null ? 4 : 3,
            validated: false,
            org_id: body.org_id,
            notes: note,
          }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
        upserted = !upsertError;
        if (upsertError) console.error('TSE upsert error:', upsertError);
      }
    }

    return new Response(
      JSON.stringify({
        indicator_code: 'MST_TSE_TURNOUT',
        value: extractedValue,
        reference_year: extractedYear,
        source: extractedValue !== null ? `TSE (via Firecrawl)` : 'TSE — preenchimento manual',
        source_url: scrapeUrl || sourceTseUrl,
        collection_method: extractedValue !== null ? 'AUTOMATIC' : 'MANUAL',
        scrape_status: scrapeStatus,
        upserted,
        note,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('ingest-tse error:', err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
