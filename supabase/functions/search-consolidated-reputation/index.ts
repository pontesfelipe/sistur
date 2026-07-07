import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireUser } from '../_shared/auth.ts';

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

const OTAs = [
  { key: 'booking', regex: /booking\.com/i, scale: 10 },
  { key: 'google', regex: /google\.com\/(maps|search|travel)/i, scale: 5 },
  { key: 'tripadvisor', regex: /tripadvisor/i, scale: 5 },
  { key: 'airbnb', regex: /airbnb\.com/i, scale: 5 },
  { key: 'expedia', regex: /expedia/i, scale: 5 },
  { key: 'hoteis', regex: /hoteis\.com/i, scale: 10 },
  { key: 'decolar', regex: /decolar\.com/i, scale: 5 },
];

function extractRating(text: string, scale: number): number | null {
  // tenta padrões: 8,7  9.2/10  4,5 estrelas  4.5/5
  const t = text.toLowerCase();
  const re = scale === 10
    ? /(\d{1,2}[\.,]\d)\s*(?:\/\s*10|de\s*10|pontos|nota)?/g
    : /(\d[\.,]\d)\s*(?:\/\s*5|de\s*5|estrelas|stars)?/g;
  const matches = [...t.matchAll(re)].map((m) => parseFloat(m[1].replace(',', '.'))).filter((n) => !isNaN(n));
  if (!matches.length) return null;
  const filtered = scale === 10 ? matches.filter((n) => n >= 1 && n <= 10) : matches.filter((n) => n >= 1 && n <= 5);
  if (!filtered.length) return null;
  const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  return scale === 10 ? avg : avg * 2; // normaliza tudo para escala 0-10
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authRes = await requireUser(req);
    if (authRes instanceof Response) return authRes;
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY ausente');
    const { businessName, location } = await req.json();
    if (!businessName) throw new Error('businessName obrigatório');

    const query = `"${businessName}" ${location ?? ''} avaliações nota review`.trim();
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 25, lang: 'pt', country: 'br' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Falha ao consultar fonte externa (HTTP ${res.status})`);
    const items: any[] = json?.data?.web || json?.data || [];

    const sources: Record<string, { rating: number; count: number; samples: string[] }> = {};
    for (const ota of OTAs) {
      const matched = items.filter((i) => ota.regex.test(i.url || ''));
      if (!matched.length) continue;
      const ratings: number[] = [];
      const samples: string[] = [];
      for (const m of matched) {
        const text = `${m.title || ''} ${m.description || ''}`;
        const r = extractRating(text, ota.scale);
        if (r != null) { ratings.push(r); samples.push(m.url); }
      }
      if (ratings.length) {
        sources[ota.key] = {
          rating: +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
          count: ratings.length,
          samples: samples.slice(0, 3),
        };
      }
    }

    const sourceKeys = Object.keys(sources);
    const allRatings = sourceKeys.map((k) => sources[k].rating);
    const consolidated_rating = allRatings.length
      ? +(allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2)
      : null;
    const consolidated_score = consolidated_rating != null ? Math.round(consolidated_rating * 10) : 0;

    let tier: 'excelente' | 'boa' | 'regular' | 'fraca' | 'sem_dados' = 'sem_dados';
    if (consolidated_rating != null) {
      if (consolidated_rating >= 8.5) tier = 'excelente';
      else if (consolidated_rating >= 7) tier = 'boa';
      else if (consolidated_rating >= 5) tier = 'regular';
      else tier = 'fraca';
    }

    const recommendations: string[] = [];
    if (sourceKeys.length < 3) recommendations.push('Ampliar presença em OTAs principais (Booking, Google, TripAdvisor, Airbnb).');
    if (consolidated_rating != null && consolidated_rating < 7) recommendations.push('Implementar plano de resposta a reviews negativos e melhoria operacional.');
    if (consolidated_rating != null && consolidated_rating >= 8.5) recommendations.push('Capitalizar reviews positivos em campanhas de marketing e venda direta.');
    if (!sourceKeys.includes('google')) recommendations.push('Verificar e otimizar Google Business Profile — principal vitrine local.');

    const analysis = {
      consolidated_rating,
      consolidated_score,
      reputation_tier: tier,
      sources,
      sources_count: sourceKeys.length,
      recommendations,
      summary: consolidated_rating != null
        ? `Reputação ${tier} com nota consolidada ${consolidated_rating}/10 em ${sourceKeys.length} fonte(s).`
        : 'Não foi possível extrair notas das OTAs publicamente — revisar presença digital.',
    };

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});