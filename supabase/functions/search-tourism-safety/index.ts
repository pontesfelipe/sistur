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

const NEGATIVE_TERMS = [
  'assalto', 'roubo', 'furto', 'arrastão', 'arrastao', 'violência', 'violencia',
  'homicídio', 'homicidio', 'tiroteio', 'sequestro', 'estupro', 'ataque', 'agressão', 'agressao',
];
const POSITIVE_TERMS = [
  'policiamento', 'segurança turística', 'seguranca turistica', 'patrulhamento',
  'delegacia do turista', 'guarda municipal', 'câmeras', 'cameras de monitoramento',
  'operação verão', 'operacao verao', 'reforço de segurança', 'reforco de seguranca',
];
const ALERT_TERMS = [
  'alerta', 'aviso', 'cuidado', 'risco', 'evite', 'área de risco', 'area de risco',
];

function countOccurrences(text: string, terms: string[]): { total: number; hits: string[] } {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  let total = 0;
  for (const t of terms) {
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const m = lower.match(re);
    if (m && m.length > 0) {
      total += m.length;
      hits.push(t);
    }
  }
  return { total, hits };
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

    const { destinationName, state } = await req.json().catch(() => ({}));
    if (!destinationName) {
      return new Response(JSON.stringify({ error: 'destinationName required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Firecrawl não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const loc = `${destinationName} ${state || ''}`.trim();

    const [crimeR, policingR, alertsR] = await Promise.all([
      firecrawlSearch(apiKey, `${loc} segurança turista assalto OR violência notícia`, 8),
      firecrawlSearch(apiKey, `${loc} delegacia do turista OR policiamento turístico`, 5),
      firecrawlSearch(apiKey, `${loc} alerta de segurança turismo`, 5),
    ]);

    const crimeItems = (crimeR?.data?.web || crimeR?.web || crimeR?.data || []) as any[];
    const policingItems = (policingR?.data?.web || policingR?.web || policingR?.data || []) as any[];
    const alertItems = (alertsR?.data?.web || alertsR?.web || alertsR?.data || []) as any[];

    const crimeText = crimeItems.map((h) => `${h.title || ''} ${h.description || h.snippet || ''}`).join(' ');
    const policingText = policingItems.map((h) => `${h.title || ''} ${h.description || h.snippet || ''}`).join(' ');
    const alertText = alertItems.map((h) => `${h.title || ''} ${h.description || h.snippet || ''}`).join(' ');
    const allText = `${crimeText} ${policingText} ${alertText}`;

    const negative = countOccurrences(allText, NEGATIVE_TERMS);
    const positive = countOccurrences(allText, POSITIVE_TERMS);
    const alerts = countOccurrences(allText, ALERT_TERMS);

    // Safety score 0-100 (higher = safer)
    // baseline 70, +positive signals, -negative signals
    let safety_score = 70 + positive.total * 4 - negative.total * 3 - alerts.total * 2;
    safety_score = Math.max(0, Math.min(100, Math.round(safety_score)));

    let safety_level: 'alto' | 'medio' | 'baixo' = 'medio';
    if (safety_score >= 70) safety_level = 'alto';
    else if (safety_score < 45) safety_level = 'baixo';

    const tourist_police_presence = positive.hits.some((t) => /delegacia|polic/i.test(t));

    const recommendations: string[] = [];
    if (safety_level === 'baixo') recommendations.push('Sinais negativos de segurança: orientar hóspedes com cartilhas, oferecer transfer próprio e monitorar áreas críticas.');
    if (!tourist_police_presence) recommendations.push('Sem delegacia/polícia turística citada: articular com poder público a presença ostensiva no entorno.');
    if (negative.total > 5) recommendations.push('Alta incidência de notícias negativas: monitorar reputação e preparar protocolo de comunicação de crise.');
    if (positive.total === 0) recommendations.push('Pouca visibilidade de iniciativas de segurança: divulgar parcerias com Guarda Municipal/PM nos canais digitais.');
    if (alerts.total > 0) recommendations.push('Há alertas ativos circulando: revisar checklist de segurança e comunicar atualizações aos hóspedes.');

    const analysis = {
      safety_score,
      safety_level,
      negative_signals: { count: negative.total, terms: negative.hits },
      positive_signals: { count: positive.total, terms: positive.hits },
      alerts: { count: alerts.total, terms: alerts.hits },
      tourist_police_presence,
      sample_news: crimeItems.slice(0, 5).map((h) => ({ title: h.title, url: h.url })),
      sample_policing: policingItems.slice(0, 3).map((h) => ({ title: h.title, url: h.url })),
      recommendations,
      summary: `Nível de segurança estimado: ${safety_level} (${safety_score}/100). ${negative.total} sinal(is) negativo(s) e ${positive.total} positivo(s) detectados.`,
    };

    return new Response(JSON.stringify({ success: true, destinationName, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('search-tourism-safety error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});