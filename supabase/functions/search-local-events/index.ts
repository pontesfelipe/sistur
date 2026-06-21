import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function firecrawlSearch(apiKey: string, query: string, limit = 8) {
  const r = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, country: 'br', lang: 'pt' }),
  });
  if (!r.ok) return null;
  return r.json();
}

const MONTHS = [
  { idx: 1, names: ['janeiro', 'jan'] },
  { idx: 2, names: ['fevereiro', 'fev'] },
  { idx: 3, names: ['março', 'marco', 'mar'] },
  { idx: 4, names: ['abril', 'abr'] },
  { idx: 5, names: ['maio', 'mai'] },
  { idx: 6, names: ['junho', 'jun'] },
  { idx: 7, names: ['julho', 'jul'] },
  { idx: 8, names: ['agosto', 'ago'] },
  { idx: 9, names: ['setembro', 'set'] },
  { idx: 10, names: ['outubro', 'out'] },
  { idx: 11, names: ['novembro', 'nov'] },
  { idx: 12, names: ['dezembro', 'dez'] },
];
const EVENT_KEYWORDS = [
  'festa', 'festival', 'carnaval', 'réveillon', 'reveillon', 'são joão', 'sao joao',
  'feira', 'congresso', 'romaria', 'procissão', 'procissao', 'rodeio', 'expo',
  'aniversário', 'aniversario da cidade', 'parada', 'natal luz', 'oktoberfest',
];

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

    const { destinationId } = await req.json().catch(() => ({}));
    if (!destinationId) {
      return new Response(JSON.stringify({ error: 'destinationId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const service = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || SUPABASE_ANON_KEY);
    const { data: dest } = await service
      .from('destinations')
      .select('id, name, uf, ibge_code')
      .eq('id', destinationId)
      .maybeSingle();

    if (!dest?.name) {
      return new Response(JSON.stringify({ error: 'Destino não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Internal observatory events (if any). Build the OR filter defensively:
    // PostgREST rejects `ibge_code.eq.` (empty value) with a 400, so only add
    // that branch when we actually have an IBGE code.
    const orParts = [`destination_id.eq.${destinationId}`];
    if (dest.ibge_code) orParts.push(`ibge_code.eq.${dest.ibge_code}`);
    const { data: internalEvents } = await service
      .from('observatory_events')
      .select('event_name, event_type, start_date, end_date, estimated_attendance')
      .or(orParts.join(','))
      .limit(30);

    // 2) Firecrawl public search
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    let publicEvents: { title: string; url: string; description: string }[] = [];
    let allText = '';
    if (apiKey) {
      const q = `eventos ${dest.name} ${(dest as any).uf || ''} calendário turístico`;
      const r = await firecrawlSearch(apiKey, q, 8);
      const items = (r?.data?.web || r?.web || r?.data || []) as any[];
      publicEvents = items.map((h) => ({
        title: h.title || '',
        url: h.url || '',
        description: h.description || h.snippet || '',
      }));
      allText = publicEvents.map((e) => `${e.title} ${e.description}`).join(' ').toLowerCase();
    }

    // 3) Detect months with event mentions
    const monthHits: Record<number, number> = {};
    for (const m of MONTHS) {
      for (const name of m.names) {
        const re = new RegExp(`\\b${name}\\b`, 'gi');
        const matches = allText.match(re);
        if (matches) monthHits[m.idx] = (monthHits[m.idx] || 0) + matches.length;
      }
    }
    // add internal events months
    for (const ev of internalEvents || []) {
      if (ev.start_date) {
        const mo = new Date(ev.start_date).getUTCMonth() + 1;
        monthHits[mo] = (monthHits[mo] || 0) + 3;
      }
    }

    const peakMonths = Object.entries(monthHits)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 4)
      .map(([m]) => Number(m))
      .sort((a, b) => a - b);

    // 4) Detect event categories
    const detectedCategories = EVENT_KEYWORDS.filter((k) => allText.includes(k));

    // 5) Score (0-100) — diversity of events and months
    const eventDensityScore = Math.min(100, (Object.keys(monthHits).length * 10) + (detectedCategories.length * 6));
    const calendarMaturityScore = Math.min(100, (internalEvents?.length || 0) * 5 + (publicEvents.length * 5));

    let seasonality: 'alta' | 'media' | 'baixa' | 'uniforme' = 'uniforme';
    const monthCount = Object.keys(monthHits).length;
    if (monthCount === 0) seasonality = 'baixa';
    else if (monthCount <= 3) seasonality = 'alta';
    else if (monthCount <= 6) seasonality = 'media';
    else seasonality = 'uniforme';

    const recommendations: string[] = [];
    if ((internalEvents?.length || 0) === 0) recommendations.push('Cadastrar eventos do calendário local no observatório para previsibilidade de demanda.');
    if (peakMonths.length > 0) recommendations.push(`Concentrar campanhas e ajuste tarifário nos meses de pico (${peakMonths.join(', ')}).`);
    if (publicEvents.length === 0) recommendations.push('Baixa visibilidade pública de eventos: trabalhar mídia, parcerias e divulgação.');
    if (detectedCategories.length < 2) recommendations.push('Diversificar tipologia de eventos (corporativo, cultural, gastronômico) para reduzir sazonalidade.');

    const analysis = {
      internal_events_count: internalEvents?.length || 0,
      public_events_count: publicEvents.length,
      detected_categories: detectedCategories,
      month_distribution: monthHits,
      peak_months: peakMonths,
      seasonality_pattern: seasonality,
      event_density_score: eventDensityScore,
      calendar_maturity_score: calendarMaturityScore,
      sample_events: publicEvents.slice(0, 6),
      recommendations,
      summary:
        publicEvents.length || (internalEvents?.length || 0)
          ? `Identificados ${publicEvents.length} evento(s) público(s) e ${internalEvents?.length || 0} no observatório. Picos: ${peakMonths.join(', ') || 'indefinido'}.`
          : 'Nenhum evento identificado em fontes públicas ou observatório.',
    };

    return new Response(JSON.stringify({ success: true, destinationName: dest.name, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('search-local-events error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});