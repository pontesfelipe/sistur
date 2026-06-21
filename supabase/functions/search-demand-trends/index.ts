import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

function classifyDemand(score: number) {
  if (score >= 75) return 'alta';
  if (score >= 50) return 'moderada';
  if (score >= 25) return 'baixa';
  return 'incipiente';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY ausente');
    const { businessName, location } = await req.json();
    if (!businessName) throw new Error('businessName obrigatório');

    const query = `"${businessName}" ${location ?? ''} turismo hospedagem reservas`.trim();
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 25, lang: 'pt', country: 'br' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Firecrawl ${res.status}`);

    const items: any[] = json?.data?.web || json?.data || [];
    const total = items.length;
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const seasonalHits: Record<string, number> = {};
    months.forEach((m) => (seasonalHits[m] = 0));
    const blob = items.map((i) => `${i.title || ''} ${i.description || ''}`).join(' ').toLowerCase();
    months.forEach((m) => {
      const matches = blob.match(new RegExp(`\\b${m}[a-z]*\\b`, 'g'));
      seasonalHits[m] = matches ? matches.length : 0;
    });
    const peak = Object.entries(seasonalHits).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);

    // Booking/Decolar/Hoteis hits = sinal de demanda transacional
    const transactional = items.filter((i) => /(booking|decolar|hoteis|airbnb|expedia|despegar)/i.test(i.url || '')).length;
    const editorial = items.filter((i) => /(tripadvisor|melhoresdestinos|viagemegastronomia|viajenaviagem|catraca|uol|g1|terra)/i.test(i.url || '')).length;

    // Score: combina volume bruto + transacional ponderado + editorial
    const rawScore = Math.min(100, Math.round((total * 2) + (transactional * 4) + (editorial * 2.5)));
    const demand_score = rawScore;
    const demand_tier = classifyDemand(demand_score);

    const recommendations: string[] = [];
    if (transactional < 3) recommendations.push('Reforçar presença em OTAs (Booking, Decolar, Airbnb) para capturar demanda transacional.');
    if (editorial < 2) recommendations.push('Investir em assessoria de imprensa e parcerias com blogs/portais de viagem.');
    if (peak.length && peak[0]) recommendations.push(`Pico aparente de menções em ${peak.slice(0,3).join(', ')} — calibrar campanhas para esses meses.`);
    if (demand_score < 30) recommendations.push('Demanda orgânica incipiente: priorizar SEO local e Google Business Profile.');

    const analysis = {
      demand_score,
      demand_tier,
      total_results: total,
      transactional_hits: transactional,
      editorial_hits: editorial,
      seasonal_distribution: seasonalHits,
      peak_months_estimated: peak,
      sample_results: items.slice(0, 5).map((i) => ({ title: i.title, url: i.url, description: i.description })),
      recommendations,
      summary: `Volume orgânico ${demand_tier} (${demand_score}/100) com ${total} resultados, ${transactional} transacionais e ${editorial} editoriais.`,
    };

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});