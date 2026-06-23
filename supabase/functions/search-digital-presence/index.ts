const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface OtaHit {
  platform: string;
  url: string | null;
  found: boolean;
}

interface DigitalPresenceAnalysis {
  own_website: { found: boolean; url: string | null; has_ssl: boolean | null };
  google_business: { found: boolean; completeness_score: number | null; has_photos: boolean | null; has_hours: boolean | null };
  otas: OtaHit[];
  ota_coverage_pct: number;
  social_media: { instagram: boolean; facebook: boolean; tiktok: boolean; youtube: boolean };
  social_coverage_pct: number;
  digital_maturity_score: number; // 1-5
  direct_channel_estimate_pct: number | null; // proxy
  summary: string;
  recommendations: string[];
}

const OTA_TARGETS = [
  { platform: 'Booking.com', site: 'booking.com' },
  { platform: 'Expedia', site: 'expedia.com' },
  { platform: 'Hoteis.com', site: 'hoteis.com' },
  { platform: 'Decolar', site: 'decolar.com' },
  { platform: 'Airbnb', site: 'airbnb.com.br' },
  { platform: 'Trivago', site: 'trivago.com.br' },
];

const SOCIAL_TARGETS = [
  { key: 'instagram', site: 'instagram.com' },
  { key: 'facebook', site: 'facebook.com' },
  { key: 'tiktok', site: 'tiktok.com' },
  { key: 'youtube', site: 'youtube.com' },
];

async function searchFirecrawl(apiKey: string, query: string, limit = 3) {
  const r = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  if (!r.ok) return null;
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { businessName, location } = await req.json();
    if (!businessName || !location) {
      return new Response(JSON.stringify({ error: 'businessName and location are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Fonte de dados externa indisponível: Presença digital pública (site oficial e redes sociais). A coleta automática deste indicador não está ativa — preencha manualmente.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const q = `"${businessName}" ${location}`;

    // Run all searches in parallel
    const otaPromises = OTA_TARGETS.map((t) =>
      searchFirecrawl(firecrawlKey, `${q} site:${t.site}`, 2).then((r) => ({ t, r }))
    );
    const socialPromises = SOCIAL_TARGETS.map((t) =>
      searchFirecrawl(firecrawlKey, `${q} site:${t.site}`, 1).then((r) => ({ t, r }))
    );
    const websitePromise = searchFirecrawl(firecrawlKey, `${q} site oficial -site:booking.com -site:tripadvisor.com -site:expedia.com -site:airbnb.com -site:facebook.com -site:instagram.com`, 3);
    const gmbPromise = searchFirecrawl(firecrawlKey, `${q} site:google.com/maps OR "Google Business" telefone horário fotos`, 2);

    const [otaResults, socialResults, websiteR, gmbR] = await Promise.all([
      Promise.all(otaPromises),
      Promise.all(socialPromises),
      websitePromise,
      gmbPromise,
    ]);

    // Build OTAs
    const otas: OtaHit[] = otaResults.map(({ t, r }) => {
      const hits = r?.data || [];
      const match = hits.find((h: any) => (h.url || '').toLowerCase().includes(t.site));
      return { platform: t.platform, url: match?.url || null, found: !!match };
    });
    const otaFoundCount = otas.filter((o) => o.found).length;
    const ota_coverage_pct = Math.round((otaFoundCount / OTA_TARGETS.length) * 100);

    // Build socials
    const social_media = { instagram: false, facebook: false, tiktok: false, youtube: false };
    socialResults.forEach(({ t, r }) => {
      const hits = r?.data || [];
      const match = hits.find((h: any) => (h.url || '').toLowerCase().includes(t.site));
      (social_media as any)[t.key] = !!match;
    });
    const socialFound = Object.values(social_media).filter(Boolean).length;
    const social_coverage_pct = Math.round((socialFound / SOCIAL_TARGETS.length) * 100);

    // Own website
    const siteHits = (websiteR?.data || []).filter((h: any) => {
      const u = (h.url || '').toLowerCase();
      return u && !OTA_TARGETS.some((t) => u.includes(t.site)) && !SOCIAL_TARGETS.some((t) => u.includes(t.site)) && !u.includes('tripadvisor') && !u.includes('google.com');
    });
    const ownSite = siteHits[0] || null;
    const own_website = {
      found: !!ownSite,
      url: ownSite?.url || null,
      has_ssl: ownSite?.url ? ownSite.url.startsWith('https://') : null,
    };

    // Google Business heuristic
    const gmbHits = (gmbR?.data || []).filter((h: any) => (h.url || '').toLowerCase().includes('google.com'));
    const gmbFound = gmbHits.length > 0;
    const gmbText = gmbHits.map((h: any) => `${h.title || ''} ${h.description || ''}`).join(' ').toLowerCase();
    const hasPhotos = gmbFound ? /foto|photo|imagem/.test(gmbText) : null;
    const hasHours = gmbFound ? /horário|hour|aberto|fecha/.test(gmbText) : null;
    const gmbCompleteness = gmbFound
      ? Math.round(((hasPhotos ? 1 : 0) + (hasHours ? 1 : 0) + 1) / 3 * 100)
      : null;
    const google_business = { found: gmbFound, completeness_score: gmbCompleteness, has_photos: hasPhotos, has_hours: hasHours };

    // Digital maturity 1-5 score
    let mat = 1;
    if (own_website.found) mat += 1;
    if (own_website.has_ssl) mat += 0.5;
    if (gmbFound) mat += 0.5;
    if (ota_coverage_pct >= 50) mat += 1;
    else if (ota_coverage_pct >= 25) mat += 0.5;
    if (social_coverage_pct >= 50) mat += 1;
    else if (social_coverage_pct >= 25) mat += 0.5;
    const digital_maturity_score = Math.max(1, Math.min(5, Math.round(mat * 10) / 10));

    // Direct channel estimate: inverse proxy of OTA dependence
    // High OTA presence → lower direct channel %. Site found bumps it.
    let direct = 20; // baseline
    if (own_website.found) direct += 15;
    if (gmbFound) direct += 5;
    if (ota_coverage_pct >= 75) direct -= 10;
    else if (ota_coverage_pct <= 25) direct += 10;
    const direct_channel_estimate_pct = Math.max(5, Math.min(70, direct));

    const recommendations: string[] = [];
    if (!own_website.found) recommendations.push('Criar site próprio com motor de reservas para reduzir dependência de OTAs.');
    if (own_website.found && !own_website.has_ssl) recommendations.push('Ativar HTTPS/SSL no site oficial.');
    if (!gmbFound) recommendations.push('Reivindicar e completar perfil no Google Business Profile.');
    if (ota_coverage_pct < 50) recommendations.push('Ampliar distribuição em OTAs principais (Booking, Expedia, Decolar).');
    if (social_coverage_pct < 50) recommendations.push('Ativar perfis em redes sociais (Instagram, Facebook) com publicações frequentes.');

    const summary = `Maturidade digital ${digital_maturity_score}/5. Presença em ${otaFoundCount}/${OTA_TARGETS.length} OTAs e ${socialFound}/${SOCIAL_TARGETS.length} redes sociais. Site próprio ${own_website.found ? 'detectado' : 'não detectado'}.`;

    const analysis: DigitalPresenceAnalysis = {
      own_website,
      google_business,
      otas,
      ota_coverage_pct,
      social_media,
      social_coverage_pct,
      digital_maturity_score,
      direct_channel_estimate_pct,
      summary,
      recommendations,
    };

    return new Response(JSON.stringify({ success: true, businessName, location, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('search-digital-presence error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});