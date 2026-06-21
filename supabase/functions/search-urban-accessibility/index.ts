import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Bloco 22 — Acessibilidade Urbana do Entorno
 * Usa Firecrawl /v2/search para pesquisar evidências de calçadas acessíveis,
 * rampas, sinalização tátil e atrativos acessíveis no município.
 * Composto heurístico baseado em quantidade de menções relevantes.
 */

const KEYWORDS = [
  { term: 'calçada acessível rampa', weight: 25 },
  { term: 'piso tátil sinalização', weight: 20 },
  { term: 'atrativo turístico acessível PCD', weight: 25 },
  { term: 'transporte público acessível', weight: 15 },
  { term: 'banheiro acessível PNE', weight: 15 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { destinationId } = await req.json();
    if (!destinationId) throw new Error('destinationId obrigatório');

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        no_data: true,
        reason: 'FIRECRAWL_API_KEY não configurada — bloco Acessibilidade indisponível.',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: dest } = await supabase
      .from('destinations')
      .select('name, uf, ibge_code')
      .eq('id', destinationId)
      .maybeSingle();

    if (!dest?.name) {
      return new Response(JSON.stringify({
        no_data: true,
        reason: 'Destino sem nome cadastrado — não é possível consultar acessibilidade.',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let totalScore = 0;
    const evidence: { keyword: string; hits: number; samples: { title: string; url: string }[] }[] = [];

    for (const kw of KEYWORDS) {
      try {
        const r = await fetch('https://api.firecrawl.dev/v2/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${kw.term} ${dest.name} ${dest.uf}`,
            limit: 5,
            lang: 'pt',
            country: 'br',
          }),
        });
        const data = await r.json().catch(() => null);
        const results = (data?.data || data?.web?.results || data?.results || []) as any[];
        const hits = results.length;
        if (hits > 0) {
          const ratio = Math.min(1, hits / 3); // 3 hits already saturate
          totalScore += kw.weight * ratio;
          evidence.push({
            keyword: kw.term,
            hits,
            samples: results.slice(0, 2).map((x) => ({ title: x.title ?? x.url ?? '—', url: x.url ?? '' })),
          });
        }
      } catch (err) {
        console.warn(`[urban-accessibility] keyword "${kw.term}" failed`, err);
      }
    }

    const totalHits = evidence.reduce((s, e) => s + e.hits, 0);
    if (totalHits === 0) {
      return new Response(JSON.stringify({
        no_data: true,
        reason: `Sem evidências web de acessibilidade para ${dest.name}/${dest.uf} — Firecrawl não retornou resultados para nenhuma das 5 dimensões pesquisadas.`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const score = Math.round(Math.max(0, Math.min(100, totalScore)));
    const tier = score >= 70 ? 'avancada' : score >= 45 ? 'moderada' : score >= 20 ? 'incipiente' : 'critica';

    const recommendations: string[] = [];
    if (score < 45) recommendations.push('Acessibilidade urbana fraca no entorno — sinalizar limitações no site e oferecer transfer adaptado.');
    if (score >= 70) recommendations.push('Entorno com boa acessibilidade — promover certificação de acessibilidade do empreendimento.');
    if (!evidence.find((e) => e.keyword.includes('atrativo'))) recommendations.push('Sem menções a atrativos acessíveis — mapear roteiros parceiros adaptados.');

    const analysis = {
      accessibility_score: score,
      accessibility_tier: tier,
      municipality: dest.name,
      uf: dest.uf,
      dimensions_covered: evidence.length,
      total_evidence_hits: totalHits,
      evidence,
      source: 'Firecrawl web search',
      recommendations,
      summary: `Acessibilidade urbana ${tier} (${score}/100): ${evidence.length} de 5 dimensões com evidência web e ${totalHits} menções totais.`,
    };

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});