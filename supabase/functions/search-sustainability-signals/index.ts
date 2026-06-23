import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function firecrawlSearch(apiKey: string, query: string, limit = 5) {
  const r = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, country: 'br', lang: 'pt' }),
  });
  if (!r.ok) return null;
  return r.json();
}

async function firecrawlScrape(apiKey: string, url: string) {
  const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  if (!r.ok) return null;
  return r.json();
}

const ESG_SIGNALS = {
  certifications: [
    { key: 'leed', patterns: [/\bLEED\b/i] },
    { key: 'green_key', patterns: [/green\s*key/i, /chave\s*verde/i] },
    { key: 'biosphere', patterns: [/biosphere/i] },
    { key: 'earthcheck', patterns: [/earth\s*check/i] },
    { key: 'iso_14001', patterns: [/ISO\s*14001/i] },
    { key: 'travelife', patterns: [/travelife/i] },
    { key: 'rainforest_alliance', patterns: [/rainforest\s*alliance/i] },
    { key: 'abnt_pbqp', patterns: [/ABNT\s*NBR\s*15401/i, /turismo\s*sustent/i] },
  ],
  practices: [
    { key: 'energy', patterns: [/energia\s*solar/i, /painel\s*solar/i, /\bfotovoltaic/i, /led/i, /eficiência\s*energ/i] },
    { key: 'water', patterns: [/reuso\s*de\s*água/i, /captação\s*de\s*chuva/i, /água\s*de\s*reuso/i] },
    { key: 'waste', patterns: [/coleta\s*seletiva/i, /reciclag/i, /compostag/i, /lixo\s*zero/i] },
    { key: 'local_sourcing', patterns: [/produtos?\s*locais/i, /fornecedor(es)?\s*locais/i, /agricultura\s*familiar/i] },
    { key: 'community', patterns: [/comunidade\s*local/i, /impacto\s*social/i, /projeto\s*social/i] },
    { key: 'plastic_free', patterns: [/sem\s*plástico/i, /plastic\s*free/i, /canudo\s*biodegrad/i] },
    { key: 'carbon', patterns: [/carbono\s*neutro/i, /carbon\s*neutral/i, /pegada\s*de\s*carbono/i] },
  ],
  accessibility: [
    { key: 'physical', patterns: [/acessibilidade/i, /cadeirante/i, /rampa/i, /elevador/i, /PCD/i] },
    { key: 'visual', patterns: [/braille/i, /piso\s*tátil/i, /deficiente\s*visual/i] },
    { key: 'auditory', patterns: [/libras/i, /surdo/i, /deficiente\s*auditiv/i] },
  ],
};

function countSignals(text: string, group: { key: string; patterns: RegExp[] }[]) {
  const found: string[] = [];
  for (const item of group) {
    if (item.patterns.some((p) => p.test(text))) found.push(item.key);
  }
  return found;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { businessName, location, websiteUrl } = await req.json().catch(() => ({}));
    if (!businessName) {
      return new Response(JSON.stringify({ error: 'businessName required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Fonte de dados externa indisponível: Sinais públicos de sustentabilidade (certificações, notícias, sites oficiais). Preencha manualmente.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const q = `"${businessName}" ${location || ''}`.trim();

    // 1) Direct site scrape if known, else discover via search
    let siteUrl = websiteUrl || null;
    let siteText = '';
    if (!siteUrl) {
      const discover = await firecrawlSearch(apiKey, `${q} site oficial sustentabilidade`, 3);
      const items = (discover?.data?.web || discover?.web || discover?.data || []) as any[];
      siteUrl = items[0]?.url || null;
    }
    if (siteUrl) {
      const s = await firecrawlScrape(apiKey, siteUrl);
      siteText = s?.data?.markdown || s?.markdown || '';
    }

    // 2) Public sustainability mentions
    const publicR = await firecrawlSearch(apiKey, `${q} sustentabilidade OR ESG OR acessibilidade`, 5);
    const publicItems = (publicR?.data?.web || publicR?.web || publicR?.data || []) as any[];
    const publicText = publicItems.map((h) => `${h.title || ''} ${h.description || h.snippet || ''}`).join(' ');

    const allText = `${siteText}\n\n${publicText}`;

    const certifications = countSignals(allText, ESG_SIGNALS.certifications);
    const practices = countSignals(allText, ESG_SIGNALS.practices);
    const accessibility = countSignals(allText, ESG_SIGNALS.accessibility);

    // Scoring (0-100)
    const certScore = Math.min(100, certifications.length * 25);
    const practScore = Math.min(100, practices.length * (100 / ESG_SIGNALS.practices.length));
    const accScore = Math.min(100, accessibility.length * (100 / ESG_SIGNALS.accessibility.length));
    const sustainability_score = Math.round(certScore * 0.4 + practScore * 0.4 + accScore * 0.2);
    const accessibility_score = Math.round(accScore);

    const recommendations: string[] = [];
    if (certifications.length === 0) recommendations.push('Buscar certificação reconhecida (ABNT NBR 15401, Green Key, Biosphere) para aumentar credibilidade ESG.');
    if (practices.length < 3) recommendations.push('Estruturar e comunicar práticas operacionais de sustentabilidade no site oficial.');
    if (accessibility.length === 0) recommendations.push('Implementar acessibilidade física (rampa, elevador, banheiro PCD) e comunicar publicamente.');
    if (sustainability_score < 40) recommendations.push('Criar uma seção de Sustentabilidade no site com indicadores e metas mensuráveis.');

    const analysis = {
      site_url: siteUrl,
      certifications,
      practices,
      accessibility,
      sustainability_score,
      accessibility_score,
      recommendations,
      summary: certifications.length || practices.length
        ? `Identificadas ${certifications.length} certificação(ões), ${practices.length} prática(s) e ${accessibility.length} sinal(is) de acessibilidade.`
        : 'Nenhum sinal claro de sustentabilidade ou acessibilidade encontrado nas fontes públicas.',
    };

    return new Response(JSON.stringify({ success: true, businessName, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('search-sustainability-signals error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});