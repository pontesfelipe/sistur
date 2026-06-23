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

function extractPricesBRL(text: string): number[] {
  const out: number[] = [];
  const re = /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n >= 60 && n <= 8000) out.push(n);
  }
  return out;
}

function stats(arr: number[]) {
  if (!arr.length) return { min: null, max: null, avg: null, median: null, count: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round((sum / sorted.length) * 100) / 100,
    median: Math.round(median * 100) / 100,
    count: sorted.length,
  };
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

    const { businessName, location } = await req.json().catch(() => ({}));
    if (!businessName) {
      return new Response(JSON.stringify({ error: 'businessName required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Fonte de dados externa indisponível: Tarifas públicas em OTAs (Booking, Decolar, Expedia). Preencha manualmente.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const q = `"${businessName}" ${location || ''}`.trim();

    // Search for prices in OTAs
    const [bookingR, marketR, googleR] = await Promise.all([
      firecrawlSearch(apiKey, `${q} site:booking.com preço diária`, 5),
      firecrawlSearch(apiKey, `hotel ${location || ''} diária média preço`, 5),
      firecrawlSearch(apiKey, `${q} diária a partir de R$`, 5),
    ]);

    const bookingItems = (bookingR?.data?.web || bookingR?.web || bookingR?.data || []) as any[];
    const marketItems = (marketR?.data?.web || marketR?.web || marketR?.data || []) as any[];
    const googleItems = (googleR?.data?.web || googleR?.web || googleR?.data || []) as any[];

    const ownText = [...bookingItems, ...googleItems]
      .map((h) => `${h.title || ''} ${h.description || h.snippet || ''}`)
      .join(' ');
    const marketText = marketItems.map((h) => `${h.title || ''} ${h.description || h.snippet || ''}`).join(' ');

    const ownPrices = extractPricesBRL(ownText);
    const marketPrices = extractPricesBRL(marketText);

    const own = stats(ownPrices);
    const market = stats(marketPrices);

    let positioning: 'premium' | 'aligned' | 'value' | 'unknown' = 'unknown';
    let pricing_index: number | null = null; // (own.avg / market.avg) * 100
    if (own.avg != null && market.avg != null && market.avg > 0) {
      pricing_index = Math.round((own.avg / market.avg) * 100);
      if (pricing_index >= 115) positioning = 'premium';
      else if (pricing_index <= 85) positioning = 'value';
      else positioning = 'aligned';
    }

    const recommendations: string[] = [];
    if (own.count === 0) recommendations.push('Sem preços públicos detectados em OTAs: revisar distribuição em Booking, Decolar e Hoteis.com.');
    if (positioning === 'value' && own.avg != null) recommendations.push('Preço abaixo do mercado: avaliar reposicionamento e revisão de receita por UH.');
    if (positioning === 'premium' && own.avg != null) recommendations.push('Preço premium: garantir entrega de valor compatível para sustentar conversão.');
    if (positioning === 'aligned') recommendations.push('Preço alinhado ao mercado: trabalhar diferenciais para escapar da guerra de preços.');

    const analysis = {
      own_property: { ...own, samples: ownPrices.slice(0, 10) },
      market_reference: { ...market, samples: marketPrices.slice(0, 10) },
      pricing_index, // 100 = paridade; >100 acima do mercado
      positioning,
      sources: {
        booking: bookingItems.slice(0, 3).map((h) => ({ url: h.url, title: h.title })),
        market: marketItems.slice(0, 3).map((h) => ({ url: h.url, title: h.title })),
      },
      recommendations,
      summary:
        positioning === 'unknown'
          ? 'Dados de preço insuficientes para posicionamento conclusivo.'
          : `Diária média estimada R$ ${own.avg?.toFixed(2)} vs mercado R$ ${market.avg?.toFixed(2)} (${positioning}).`,
    };

    return new Response(JSON.stringify({ success: true, businessName, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('search-pricing-positioning error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});