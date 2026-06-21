import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function firecrawlSearch(apiKey: string, query: string, limit = 6) {
  const r = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, country: 'br', lang: 'pt' }),
  });
  if (!r.ok) return null;
  return r.json();
}

const MODES = [
  { key: 'uber', label: 'Uber', patterns: [/\buber\b/i] },
  { key: '99', label: '99', patterns: [/\b99(\s*pop|\s*taxi)?\b/i, /99app/i] },
  { key: 'indrive', label: 'inDrive', patterns: [/in\s*drive/i] },
  { key: 'bus', label: 'Ônibus urbano', patterns: [/ônibus\s*urbano/i, /transporte\s*coletivo/i, /linha\s*de\s*ônibus/i] },
  { key: 'metro', label: 'Metrô / VLT', patterns: [/\bmetrô\b/i, /\bmetro\b/i, /\bVLT\b/i] },
  { key: 'taxi', label: 'Táxi', patterns: [/\btáxi\b/i, /\btaxi\b/i, /ponto\s*de\s*taxi/i] },
  { key: 'bike', label: 'Bicicleta / Bike sharing', patterns: [/bike\s*shar/i, /aluguel\s*de\s*bicicleta/i, /ciclovia/i] },
  { key: 'shuttle', label: 'Shuttle / Transfer', patterns: [/transfer/i, /shuttle/i, /van\s*turística/i] },
  { key: 'rental_car', label: 'Aluguel de carro', patterns: [/aluguel\s*de\s*carro/i, /loca[çc]ão\s*de\s*ve[íi]culo/i, /rent\s*a\s*car/i] },
];

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

    const { destinationName, state } = await req.json().catch(() => ({}));
    if (!destinationName) return new Response(JSON.stringify({ error: 'destinationName required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'Firecrawl não configurado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const loc = `${destinationName} ${state || ''}`.trim();
    const [appsR, transitR, rentalR] = await Promise.all([
      firecrawlSearch(apiKey, `${loc} Uber OR 99 disponível`, 6),
      firecrawlSearch(apiKey, `${loc} transporte público ônibus metrô VLT`, 6),
      firecrawlSearch(apiKey, `${loc} aluguel de carro OR transfer OR bike sharing`, 6),
    ]);

    const allItems = [
      ...((appsR?.data?.web || appsR?.web || appsR?.data || []) as any[]),
      ...((transitR?.data?.web || transitR?.web || transitR?.data || []) as any[]),
      ...((rentalR?.data?.web || rentalR?.web || rentalR?.data || []) as any[]),
    ];
    const text = allItems.map((h) => `${h.title || ''} ${h.description || h.snippet || ''}`).join(' ');

    const modesAvailable = MODES.filter((m) => m.patterns.some((p) => p.test(text)));
    const modesByKey = modesAvailable.map((m) => ({ key: m.key, label: m.label }));

    const appBasedCount = modesAvailable.filter((m) => ['uber', '99', 'indrive'].includes(m.key)).length;
    const transitCount = modesAvailable.filter((m) => ['bus', 'metro'].includes(m.key)).length;
    const altCount = modesAvailable.filter((m) => ['bike', 'shuttle', 'rental_car'].includes(m.key)).length;

    // 0-100 coverage score
    const coverage_score = Math.min(100, Math.round((modesAvailable.length / MODES.length) * 100));
    // dependence on car/app: high if only apps/rental available
    const car_dependence = transitCount === 0 ? (appBasedCount > 0 ? 'alta' : 'extrema') : (transitCount === 1 ? 'media' : 'baixa');

    const recommendations: string[] = [];
    if (coverage_score < 40) recommendations.push('Baixa cobertura de transporte: oferecer transfer próprio e parceria com locadora.');
    if (transitCount === 0) recommendations.push('Sem transporte público citado: priorizar shuttle/transfer e informar opções ao hóspede.');
    if (appBasedCount === 0) recommendations.push('Apps de mobilidade indisponíveis: manter convênio com táxis e van turística.');
    if (altCount === 0) recommendations.push('Sem alternativas (bike/transfer/locadora): explorar parcerias para diversificar mobilidade do hóspede.');

    const analysis = {
      modes_available: modesByKey,
      mode_count: modesAvailable.length,
      app_based_count: appBasedCount,
      transit_count: transitCount,
      alt_count: altCount,
      coverage_score,
      car_dependence,
      sample_sources: allItems.slice(0, 5).map((h) => ({ title: h.title, url: h.url })),
      recommendations,
      summary: `${modesAvailable.length} modais detectados (${modesAvailable.map((m) => m.label).join(', ') || '—'}). Dependência de carro: ${car_dependence}.`,
    };

    return new Response(JSON.stringify({ success: true, analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('search-local-transport error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});