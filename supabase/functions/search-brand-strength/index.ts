import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function firecrawlSearch(apiKey: string, query: string, limit = 10) {
  const r = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, country: 'br', lang: 'pt' }),
  });
  if (!r.ok) return null;
  return r.json();
}

function uniqueDomains(items: any[]): string[] {
  const out = new Set<string>();
  for (const h of items) {
    try { out.add(new URL(h.url).hostname.replace(/^www\./, '')); } catch { /* ignore */ }
  }
  return Array.from(out);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { businessName, location } = await req.json().catch(() => ({}));
    if (!businessName) return new Response(JSON.stringify({ error: 'businessName required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'Firecrawl não configurado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const q = `"${businessName}" ${location || ''}`.trim();
    const [generalR, newsR, otaR] = await Promise.all([
      firecrawlSearch(apiKey, q, 10),
      firecrawlSearch(apiKey, `${q} notícia`, 10),
      firecrawlSearch(apiKey, `${q} site:booking.com OR site:tripadvisor.com.br OR site:decolar.com`, 10),
    ]);

    const generalItems = (generalR?.data?.web || generalR?.web || generalR?.data || []) as any[];
    const newsItems = (newsR?.data?.web || newsR?.web || newsR?.data || []) as any[];
    const otaItems = (otaR?.data?.web || otaR?.web || otaR?.data || []) as any[];

    const allItems = [...generalItems, ...newsItems, ...otaItems];
    const domains = uniqueDomains(allItems);

    // Tier domains
    const authoritative = ['booking.com', 'tripadvisor.com.br', 'tripadvisor.com', 'decolar.com', 'hoteis.com', 'expedia.com.br', 'g1.globo.com', 'uol.com.br', 'folha.uol.com.br', 'estadao.com.br', 'instagram.com', 'facebook.com'];
    const authorityHits = domains.filter((d) => authoritative.some((a) => d.endsWith(a)));
    const newsHits = uniqueDomains(newsItems).filter((d) => /globo|uol|folha|estadao|terra|r7|cnn|metropoles|noticias/.test(d));
    const otaHits = uniqueDomains(otaItems).filter((d) => /booking|tripadvisor|decolar|hoteis|expedia|airbnb/.test(d));

    // Brand strength score
    const visibilityScore = Math.min(40, generalItems.length * 4);
    const authorityScore = Math.min(35, authorityHits.length * 5);
    const newsScore = Math.min(15, newsHits.length * 5);
    const otaScore = Math.min(10, otaHits.length * 3);
    const brand_strength_score = Math.round(visibilityScore + authorityScore + newsScore + otaScore);

    let brand_tier: 'forte' | 'consolidada' | 'emergente' | 'baixa' = 'baixa';
    if (brand_strength_score >= 70) brand_tier = 'forte';
    else if (brand_strength_score >= 50) brand_tier = 'consolidada';
    else if (brand_strength_score >= 25) brand_tier = 'emergente';

    const recommendations: string[] = [];
    if (otaHits.length === 0) recommendations.push('Sem presença em OTAs detectada: cadastrar em Booking, Decolar e TripAdvisor.');
    if (newsHits.length === 0) recommendations.push('Sem citações em mídia: trabalhar assessoria de imprensa e pautas com veículos regionais.');
    if (brand_strength_score < 30) recommendations.push('Marca pouco visível: investir em SEO local e parcerias de conteúdo.');
    if (brand_tier === 'forte') recommendations.push('Marca forte: explorar storytelling, programa de fidelidade e cobranding.');

    const analysis = {
      brand_strength_score,
      brand_tier,
      total_results: allItems.length,
      unique_domains: domains.length,
      authority_mentions: authorityHits,
      news_mentions: newsHits,
      ota_presence: otaHits,
      sample_results: allItems.slice(0, 8).map((h) => ({ title: h.title, url: h.url, description: h.description || h.snippet || '' })),
      recommendations,
      summary: `Força da marca: ${brand_tier} (${brand_strength_score}/100). ${allItems.length} resultados, ${domains.length} domínios únicos, ${otaHits.length} OTAs.`,
    };

    return new Response(JSON.stringify({ success: true, businessName, analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('search-brand-strength error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});