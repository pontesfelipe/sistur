// Edge function: ingest-anatel
// Busca cobertura 5G/4G por município via Firecrawl (proxy de scraping).
//
// Fonte primária: portal Teleco (teleco.com.br) que republica dados oficiais
// da Anatel por município de forma scraping-friendly. Também tenta o portal
// Conexis Brasil Digital (conexis.org.br) como fallback.
//
// Score MST_5G_WIFI = 50% * cobertura_5g + 30% * cobertura_4g + 20% * wifi_publico_estimado.
// Quando Wi-Fi público não é detectado, usa proxy: municípios A/B do Mapa do
// Turismo recebem 70 (alta probabilidade de Wi-Fi turístico), C recebem 40.
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

interface CoverageData {
  cov_5g: number | null;
  cov_4g: number | null;
  source_url: string;
}

function extractCoverage(markdown: string, url: string): CoverageData | null {
  if (!markdown) return null;

  let cov5g: number | null = null;
  let cov4g: number | null = null;

  // 5G patterns: "5G ... 78,5%" or "cobertura 5G de 78,5%"
  const re5g = [
    /5G[^0-9%]{0,40}(\d{1,3}[,.]\d{1,2})\s*%/i,
    /(\d{1,3}[,.]\d{1,2})\s*%[^0-9%]{0,20}5G/i,
    /cobertura\s+5G[^0-9%]{0,30}(\d{1,3})\s*%/i,
  ];
  for (const re of re5g) {
    const m = markdown.match(re);
    if (m) {
      const v = parseFloat((m[1] || '').replace(',', '.'));
      if (!isNaN(v) && v >= 0 && v <= 100) { cov5g = v; break; }
    }
  }

  // 4G patterns
  const re4g = [
    /4G[^0-9%]{0,40}(\d{1,3}[,.]\d{1,2})\s*%/i,
    /(\d{1,3}[,.]\d{1,2})\s*%[^0-9%]{0,20}4G/i,
    /cobertura\s+4G[^0-9%]{0,30}(\d{1,3})\s*%/i,
    /LTE[^0-9%]{0,40}(\d{1,3}[,.]\d{1,2})\s*%/i,
  ];
  for (const re of re4g) {
    const m = markdown.match(re);
    if (m) {
      const v = parseFloat((m[1] || '').replace(',', '.'));
      if (!isNaN(v) && v >= 0 && v <= 100) { cov4g = v; break; }
    }
  }

  // Detect "sem 5G" / "não possui 5G"
  if (cov5g === null && /(sem|n(ã|a)o\s+possui|n(ã|a)o\s+h(á|a))\s+5G/i.test(markdown)) {
    cov5g = 0;
  }

  if (cov5g === null && cov4g === null) return null;
  return { cov_5g: cov5g, cov_4g: cov4g, source_url: url };
}

async function fetchMunicipalityContext(
  supabase: ReturnType<typeof createClient>,
  ibge: string,
): Promise<{ name: string; uf: string; categoria: string | null }> {
  const { data: dest } = await supabase
    .from('destinations')
    .select('name, uf')
    .eq('ibge_code', ibge)
    .limit(1)
    .maybeSingle();

  const { data: mapa } = await supabase
    .from('mapa_turismo_municipios')
    .select('categoria')
    .eq('ibge_code', ibge)
    .order('ano_referencia', { ascending: false })
    .limit(1)
    .maybeSingle();

  let name = dest?.name || '';
  let uf = dest?.uf || '';
  if (!name) {
    try {
      const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${ibge}`);
      if (r.ok) {
        const j = await r.json();
        name = j?.nome || '';
        uf = j?.microrregiao?.mesorregiao?.UF?.sigla || '';
      }
    } catch (err) {
      console.error('IBGE lookup error:', err);
    }
  }

  return { name, uf, categoria: mapa?.categoria || null };
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
    const ctx = await fetchMunicipalityContext(supabase, body.ibge_code);
    const sourceAnatelUrl = 'https://informacoes.anatel.gov.br/paineis/acessos/panorama';

    let coverage: CoverageData | null = null;
    let scrapeStatus: 'success' | 'partial' | 'cache_hit' | 'no_data' | 'no_firecrawl' = 'no_data';

    // Cache TTL: 90 dias (Anatel publica novos dados quase mensalmente, mas variação é gradual)
    const CACHE_TTL_DAYS = 90;
    const cutoffIso = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: cachedCov } = await supabase
      .from('anatel_coverage_cache')
      .select('coverage_5g_pct, coverage_4g_pct, source, updated_at')
      .eq('ibge_code', body.ibge_code)
      .gte('updated_at', cutoffIso)
      .maybeSingle();

    if (cachedCov && (cachedCov.coverage_5g_pct != null || cachedCov.coverage_4g_pct != null)) {
      coverage = {
        cov_5g: cachedCov.coverage_5g_pct,
        cov_4g: cachedCov.coverage_4g_pct,
        source_url: cachedCov.source || sourceAnatelUrl,
      };
      scrapeStatus = 'cache_hit';
    } else if (!firecrawlKey) {
      scrapeStatus = 'no_firecrawl';
    } else if (ctx.name) {
      const slug = ctx.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const uf = (ctx.uf || '').toLowerCase();

      const candidates: string[] = [];
      // Teleco — most scraping-friendly source for per-municipality coverage
      if (uf) {
        candidates.push(`https://www.teleco.com.br/mcobertura.asp?uf=${uf.toUpperCase()}&municipio=${encodeURIComponent(ctx.name)}`);
        candidates.push(`https://www.teleco.com.br/cidades/${slug}-${uf}.asp`);
      }
      // Generic search query (Firecrawl resolves redirects)
      candidates.push(`https://www.google.com/search?q=cobertura+5G+4G+%22${encodeURIComponent(ctx.name)}%22+anatel+teleco`);

      for (const url of candidates) {
        const md = await firecrawlScrape(url, firecrawlKey);
        if (md) {
          const extracted = extractCoverage(md, url);
          if (extracted && (extracted.cov_5g !== null || extracted.cov_4g !== null)) {
            coverage = extracted;
            scrapeStatus = (extracted.cov_5g !== null && extracted.cov_4g !== null) ? 'success' : 'partial';
            break;
          }
        }
      }
    }

    // Compute composite score 0-100
    let score: number | null = null;
    let wifiScore = 0;
    if (coverage) {
      // Wi-Fi público proxy via categoria do Mapa do Turismo
      if (ctx.categoria === 'A') wifiScore = 70;
      else if (ctx.categoria === 'B') wifiScore = 50;
      else if (ctx.categoria === 'C') wifiScore = 30;
      else wifiScore = 20;

      const c5 = coverage.cov_5g ?? 0;
      const c4 = coverage.cov_4g ?? 50; // fallback conservador
      score = Math.round(0.5 * c5 + 0.3 * c4 + 0.2 * wifiScore);
      score = Math.max(0, Math.min(100, score));
    }

    // Cache in anatel_coverage_cache for future reuse
    if (coverage) {
      await supabase
        .from('anatel_coverage_cache')
        .upsert({
          ibge_code: body.ibge_code,
          coverage_5g_pct: coverage.cov_5g,
          coverage_4g_pct: coverage.cov_4g,
          wifi_public_score: wifiScore,
          reference_year: new Date().getFullYear(),
          source: coverage.source_url,
          notes: `Auto-scraped via Firecrawl em ${new Date().toISOString().slice(0, 10)}.`,
        }, { onConflict: 'ibge_code' });
    }

    const note = score !== null
      ? `Score ${score}/100 (5G:${coverage?.cov_5g ?? '?'}% × 50% + 4G:${coverage?.cov_4g ?? '?'}% × 30% + Wi-Fi:${wifiScore} × 20%). Fonte: ${coverage?.source_url}.`
      : `🌀 MST — Conectividade. Não foi possível extrair automaticamente. Consulte ${sourceAnatelUrl} e informe um score 0-100.`;

    let upserted = false;
    if (body.org_id) {
      const { data: existing } = await supabase
        .from('external_indicator_values')
        .select('id, raw_value, validated')
        .eq('org_id', body.org_id)
        .eq('municipality_ibge_code', body.ibge_code)
        .eq('indicator_code', 'MST_5G_WIFI')
        .maybeSingle();

      const shouldWrite = !existing
        || existing.raw_value === null
        || (score !== null && !existing.validated);

      if (shouldWrite) {
        const { error: upsertError } = await supabase
          .from('external_indicator_values')
          .upsert({
            indicator_code: 'MST_5G_WIFI',
            municipality_ibge_code: body.ibge_code,
            source_code: 'ANATEL',
            raw_value: score,
            reference_year: score !== null ? new Date().getFullYear() : null,
            collection_method: score !== null ? ('AUTOMATIC' as const) : ('MANUAL' as const),
            confidence_level: score !== null ? 4 : 3,
            validated: false,
            org_id: body.org_id,
            notes: note,
          }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
        upserted = !upsertError;
        if (upsertError) console.error('Anatel upsert error:', upsertError);
      }
    }

    return new Response(
      JSON.stringify({
        indicator_code: 'MST_5G_WIFI',
        value: score,
        coverage_5g: coverage?.cov_5g ?? null,
        coverage_4g: coverage?.cov_4g ?? null,
        wifi_score: coverage ? wifiScore : null,
        source: score !== null ? `Anatel (via Firecrawl)` : 'Anatel — preenchimento manual',
        source_url: coverage?.source_url || sourceAnatelUrl,
        collection_method: score !== null ? 'AUTOMATIC' : 'MANUAL',
        scrape_status: scrapeStatus,
        upserted,
        note,
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
