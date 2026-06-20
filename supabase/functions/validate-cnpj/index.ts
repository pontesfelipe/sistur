import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function cleanCnpj(s: string): string {
  return (s || '').replace(/\D/g, '');
}

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
    const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify JWT
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const cnpj = cleanCnpj(body?.cnpj ?? '');
    if (cnpj.length !== 14 || !validateCnpjChecksum(cnpj)) {
      return new Response(JSON.stringify({ error: 'CNPJ inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Check cache (24h)
    const { data: cached } = await service
      .from('cnpj_validation_cache')
      .select('*')
      .eq('cnpj', cnpj)
      .maybeSingle();

    if (cached) {
      const fetched = new Date(cached.fetched_at).getTime();
      if (Date.now() - fetched < 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ success: true, cached: true, data: cached }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch from public BrasilAPI (no key needed)
    let payload: any = null;
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (resp.ok) payload = await resp.json();
    } catch (e) {
      console.error('BrasilAPI fetch error:', e);
    }

    if (!payload) {
      return new Response(JSON.stringify({ error: 'CNPJ não localizado na Receita Federal' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cnaePrincipal = String(payload.cnae_fiscal || '');
    // CADASTUR-relevant CNAEs (turismo): 5510, 5590, 7911, 7912, 7990, 5611, 5612, 5621, 9329, 7990
    const turismoCnaes = ['5510', '5590', '7911', '7912', '7990', '9319', '9329'];
    const cadasturRelevant = turismoCnaes.some((c) => cnaePrincipal.startsWith(c));
    const cadasturStatus = cadasturRelevant ? 'requer_verificacao_manual' : 'nao_aplicavel';

    const record = {
      cnpj,
      razao_social: payload.razao_social || null,
      nome_fantasia: payload.nome_fantasia || null,
      situacao_cadastral: payload.descricao_situacao_cadastral || null,
      data_situacao: payload.data_situacao_cadastral || null,
      cnae_principal: cnaePrincipal || null,
      cnae_descricao: payload.cnae_fiscal_descricao || null,
      endereco: {
        logradouro: payload.logradouro,
        numero: payload.numero,
        bairro: payload.bairro,
        municipio: payload.municipio,
        uf: payload.uf,
        cep: payload.cep,
      },
      cadastur_status: cadasturStatus,
      raw_response: payload,
      fetched_at: new Date().toISOString(),
    };

    await service.from('cnpj_validation_cache').upsert(record);

    return new Response(JSON.stringify({ success: true, cached: false, data: record }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('validate-cnpj error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});