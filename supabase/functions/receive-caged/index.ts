import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-caged-token',
};

/**
 * Recebe o CSV agregado do CAGED (por município/mês/setor) enviado pela
 * automação externa (GitHub Actions), grava em official-data/caged/ e dispara
 * a ingestão. Autenticação: header x-caged-token igual ao secret
 * CAGED_INGEST_TOKEN. Body JSON: { month: "YYYYMM", csv: "<conteúdo>" }.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const expected = Deno.env.get('CAGED_INGEST_TOKEN');
  const provided = req.headers.get('x-caged-token') ?? '';
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Checagem idempotente: GET ?check=YYYYMM -> { exists, records }
  if (req.method === 'GET') {
    const check = new URL(req.url).searchParams.get('check') ?? '';
    if (!/^\d{6}$/.test(check)) {
      return new Response(JSON.stringify({ error: 'check deve ser YYYYMM' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { count, error } = await sb.from('caged_tourism_employment')
      .select('id', { count: 'exact', head: true })
      .eq('reference_year', Number(check.slice(0, 4)))
      .eq('reference_month', Number(check.slice(4)));
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ month: check, exists: (count ?? 0) > 0, records: count ?? 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const month = String(body.month ?? '');
    const csv = String(body.csv ?? '');
    if (!/^\d{6}$/.test(month)) {
      return new Response(JSON.stringify({ error: 'month deve ser YYYYMM' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!csv.includes('ibge_code;ano;mes;setor')) {
      return new Response(JSON.stringify({ error: 'CSV inválido: cabeçalho esperado ausente' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (csv.length > 40 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'CSV grande demais' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const path = `caged/caged_${month}.csv`;
    const { error: upErr } = await supabase.storage
      .from('official-data')
      .upload(path, new Blob([csv], { type: 'text/csv' }), { upsert: true });
    if (upErr) throw new Error(`storage: ${upErr.message}`);

    // Dispara a ingestão com service role
    const ingResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ingest-caged`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: '{}',
    });
    const ingText = await ingResp.text();

    return new Response(
      JSON.stringify({ success: true, stored: path, ingestion_status: ingResp.status, ingestion: ingText.slice(0, 500) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[receive-caged] Fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
