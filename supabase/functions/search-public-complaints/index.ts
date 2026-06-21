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

function parseNumberBR(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
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
      return new Response(JSON.stringify({ error: 'Firecrawl não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const q = `"${businessName}" ${location || ''}`.trim();
    const [reclameR, proconR] = await Promise.all([
      firecrawlSearch(apiKey, `${q} site:reclameaqui.com.br`, 5),
      firecrawlSearch(apiKey, `${q} procon reclamação`, 5),
    ]);

    const reclameItems = (reclameR?.data?.web || reclameR?.web || reclameR?.data || []) as any[];
    const reclameHits = reclameItems.filter((h) => (h.url || '').toLowerCase().includes('reclameaqui.com.br'));

    const reclameTop = reclameHits[0] || null;
    const text = reclameHits.map((h) => `${h.title || ''} ${h.description || h.snippet || ''}`).join(' ');

    // Parse RA score & metrics from snippets
    const scoreMatch = text.match(/(\d[.,]\d)\s*\/\s*10/);
    const ra_score = scoreMatch ? parseNumberBR(scoreMatch[1]) : null;

    const complaintsMatch = text.match(/(\d{1,3}(?:[.,]\d{3})*)\s*reclama/i);
    const total_complaints = complaintsMatch ? parseInt(complaintsMatch[1].replace(/[.,]/g, ''), 10) : null;

    const solvedMatch = text.match(/(\d{1,3}[.,]?\d?)\s*%\s*(?:solucion|resolvid|respondid)/i);
    const solved_pct = solvedMatch ? parseNumberBR(solvedMatch[1]) : null;

    const ratingMatch = text.match(/(?:nota|índice).*?(\d[.,]\d)/i);
    const consumer_rating = ratingMatch ? parseNumberBR(ratingMatch[1]) : null;

    const reputationCategoryMatch = text.match(/(Ótimo|Bom|Regular|Ruim|Não Recomendada|Péssimo)/i);
    const reputation_category = reputationCategoryMatch ? reputationCategoryMatch[1] : null;

    const proconItems = (proconR?.data?.web || proconR?.web || proconR?.data || []) as any[];
    const procon_mentions = proconItems.filter((h) => /procon/i.test(h.url + ' ' + h.title)).length;

    // 0-100 reputation score (higher = better)
    let public_reputation_score: number | null = null;
    if (ra_score != null) {
      public_reputation_score = Math.round(ra_score * 10);
    } else if (solved_pct != null) {
      public_reputation_score = Math.round(solved_pct);
    } else if (!reclameTop && procon_mentions === 0) {
      // no complaints found anywhere — neutral high
      public_reputation_score = 80;
    }

    const recommendations: string[] = [];
    if (ra_score != null && ra_score < 6) recommendations.push('Nota baixa no Reclame Aqui: estruturar SAC e responder reclamações em até 48h.');
    if (solved_pct != null && solved_pct < 60) recommendations.push('Baixa taxa de solução: revisar processos de pós-venda e atendimento.');
    if (procon_mentions > 0) recommendations.push('Registros no Procon detectados: revisar conformidade contratual e CDC.');
    if (!reclameTop) recommendations.push('Sem perfil ativo no Reclame Aqui: criar e monitorar para capturar feedback público.');

    const analysis = {
      reclame_aqui: {
        found: !!reclameTop,
        url: reclameTop?.url || null,
        ra_score, // 0-10
        reputation_category,
        total_complaints,
        solved_pct,
        consumer_rating,
      },
      procon: { mentions: procon_mentions, sources: proconItems.slice(0, 3).map((h) => ({ url: h.url, title: h.title })) },
      public_reputation_score, // 0-100
      recommendations,
      summary: reclameTop
        ? `Reclame Aqui: ${reputation_category ?? 'sem categoria'}${ra_score != null ? ` (nota ${ra_score}/10)` : ''}${total_complaints != null ? `, ${total_complaints} reclamações` : ''}.`
        : 'Nenhum perfil identificado no Reclame Aqui.',
    };

    return new Response(JSON.stringify({ success: true, businessName, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('search-public-complaints error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});