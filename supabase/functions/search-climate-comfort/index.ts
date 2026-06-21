import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Open-Meteo climate normals (free, no key)
async function fetchClimate(lat: number, lon: number) {
  // Use ERA5 monthly aggregates over last 5 full years
  const end = new Date(); end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() - 1);
  const start = new Date(end); start.setUTCFullYear(end.getUTCFullYear() - 5);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_mean,precipitation_sum&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`open-meteo ${r.status}`);
  return r.json();
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

    const { destinationId } = await req.json().catch(() => ({}));
    if (!destinationId) return new Response(JSON.stringify({ error: 'destinationId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const service = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || SUPABASE_ANON_KEY);
    const { data: dest } = await service.from('destinations').select('id, name, latitude, longitude').eq('id', destinationId).maybeSingle();
    if (!dest?.latitude || !dest?.longitude) {
      return new Response(JSON.stringify({ error: 'Destino sem coordenadas geográficas' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const climate = await fetchClimate(Number(dest.latitude), Number(dest.longitude));
    const days: string[] = climate?.daily?.time || [];
    const temps: number[] = climate?.daily?.temperature_2m_mean || [];
    const precs: number[] = climate?.daily?.precipitation_sum || [];

    const monthly: Record<number, { temp: number[]; prec: number[] }> = {};
    for (let i = 0; i < days.length; i++) {
      const m = new Date(days[i] + 'T00:00:00Z').getUTCMonth() + 1;
      if (!monthly[m]) monthly[m] = { temp: [], prec: [] };
      if (Number.isFinite(temps[i])) monthly[m].temp.push(temps[i]);
      if (Number.isFinite(precs[i])) monthly[m].prec.push(precs[i]);
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

    const months_summary = Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
      const t = avg(monthly[m]?.temp || []);
      const totalRain = sum(monthly[m]?.prec || []);
      const rainyDays = (monthly[m]?.prec || []).filter((v) => v >= 1).length;
      const yearsCount = Math.max(1, Math.round((monthly[m]?.prec || []).length / 30));
      return {
        month: m,
        label: MONTH_LABELS[m - 1],
        temperature_c: Math.round(t * 10) / 10,
        precipitation_mm: Math.round(totalRain / yearsCount),
        rainy_days: Math.round(rainyDays / yearsCount),
      };
    });

    // Comfort score (0-100) per month: optimal 20-28°C, low rain
    const monthComfort = months_summary.map((m) => {
      const tempDist = Math.max(0, Math.abs(m.temperature_c - 24) - 4); // tolerance 20-28
      const tempPenalty = Math.min(60, tempDist * 5);
      const rainPenalty = Math.min(40, m.precipitation_mm / 10); // 400mm -> 40
      return { month: m.month, score: Math.round(Math.max(0, 100 - tempPenalty - rainPenalty)) };
    });

    const climateComfortScore = Math.round(avg(monthComfort.map((m) => m.score)));
    const bestMonths = [...monthComfort].sort((a, b) => b.score - a.score).slice(0, 3).map((m) => m.month).sort((a, b) => a - b);
    const worstMonths = [...monthComfort].sort((a, b) => a.score - b.score).slice(0, 3).map((m) => m.month).sort((a, b) => a - b);
    const rainyMonths = months_summary.filter((m) => m.rainy_days >= 15).map((m) => m.month);

    const recommendations: string[] = [];
    if (climateComfortScore < 50) recommendations.push('Clima desafiador na maior parte do ano: investir em ambientes climatizados e experiências indoor.');
    if (rainyMonths.length >= 5) recommendations.push('Mais de 5 meses chuvosos: oferecer experiências cobertas e ajustar comunicação sazonal.');
    if (bestMonths.length) recommendations.push(`Concentrar campanhas de alta temporada nos meses ${bestMonths.map((m) => MONTH_LABELS[m - 1]).join(', ')}.`);
    if (worstMonths.length) recommendations.push(`Trabalhar tarifas e pacotes para ${worstMonths.map((m) => MONTH_LABELS[m - 1]).join(', ')} (menor conforto climático).`);

    const analysis = {
      latitude: Number(dest.latitude),
      longitude: Number(dest.longitude),
      climate_comfort_score: climateComfortScore,
      months_summary,
      month_comfort: monthComfort,
      best_months: bestMonths,
      worst_months: worstMonths,
      rainy_months: rainyMonths,
      recommendations,
      summary: `Conforto climático médio ${climateComfortScore}/100. ${bestMonths.length ? `Melhores meses: ${bestMonths.map((m) => MONTH_LABELS[m - 1]).join(', ')}.` : ''}`,
      data_source: 'Open-Meteo ERA5 (últimos 5 anos)',
    };

    return new Response(JSON.stringify({ success: true, analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('search-climate-comfort error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});