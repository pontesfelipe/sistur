import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function validateCnpjChecksum(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: string) => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base.split('').reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(cnpj.slice(0, 12));
  const d2 = calc(cnpj.slice(0, 12) + d1);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

/** Extrai sequências de 14 dígitos (com ou sem máscara) e mantém só as com checksum válido. */
function extractCnpjs(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  // Padrão com máscara 00.000.000/0000-00 ou apenas 14 dígitos contíguos
  const masked = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) || [];
  for (const m of masked) {
    const digits = m.replace(/\D/g, '');
    if (digits.length === 14 && validateCnpjChecksum(digits)) out.add(digits);
  }
  return Array.from(out);
}

async function searchFirecrawl(apiKey: string, query: string, limit = 5) {
  const resp = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, scrapeOptions: { formats: ['markdown'] } }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Firecrawl HTTP ${resp.status}: ${t}`);
  }
  return resp.json();
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
    if (!businessName || typeof businessName !== 'string') {
      return new Response(JSON.stringify({ error: 'businessName é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Fonte externa indisponível: FIRECRAWL_API_KEY não configurada.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const loc = (location || '').toString().trim();
    const queries = [
      `"${businessName}" ${loc} CNPJ`,
      `"${businessName}" ${loc} site:cnpj.biz OR site:consultacnpj.com OR site:cnpj.info`,
      `${businessName} ${loc} razão social CNPJ Receita Federal`,
    ];

    const results = await Promise.allSettled(
      queries.map((q) => searchFirecrawl(firecrawlKey, q, 5)),
    );

    // Conta ocorrências por CNPJ (rank por frequência)
    const tally = new Map<string, { count: number; sources: Set<string> }>();
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const items = (r.value?.data || []) as any[];
      for (const item of items) {
        const text = `${item?.title ?? ''}\n${item?.description ?? ''}\n${item?.markdown ?? ''}`;
        const cnpjs = extractCnpjs(text);
        for (const c of cnpjs) {
          const entry = tally.get(c) || { count: 0, sources: new Set<string>() };
          entry.count += 1;
          if (item?.url) entry.sources.add(item.url as string);
          tally.set(c, entry);
        }
      }
    }

    const ranked = Array.from(tally.entries())
      .map(([cnpj, v]) => ({ cnpj, count: v.count, sources: Array.from(v.sources).slice(0, 5) }))
      .sort((a, b) => b.count - a.count);

    if (ranked.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum CNPJ encontrado em fontes públicas para este empreendimento.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, businessName, location: loc, best: ranked[0], candidates: ranked.slice(0, 5) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('discover-cnpj error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});