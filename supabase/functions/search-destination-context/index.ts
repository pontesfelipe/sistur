import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { destination_id } = await req.json().catch(() => ({}));
    if (!destination_id) {
      return new Response(JSON.stringify({ error: 'destination_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const svc = createClient(SUPABASE_URL, SERVICE);
    const { data: dest } = await svc
      .from('destinations')
      .select('id, name, uf, ibge_code, tourism_region, has_pdt, municipality_type')
      .eq('id', destination_id)
      .maybeSingle();

    if (!dest) {
      return new Response(JSON.stringify({ error: 'Destino não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ibge = dest.ibge_code;
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const [anacR, anatelR, eventsR, mapaR, cadunicoR, ctxR] = await Promise.all([
      ibge ? svc.from('anac_air_connectivity').select('*').eq('ibge_code', ibge).order('ref_year', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
      ibge ? svc.from('anatel_coverage_cache').select('*').eq('ibge_code', ibge).maybeSingle() : Promise.resolve({ data: null }),
      svc.from('observatory_events').select('id, name, start_date, end_date, category').eq('destination_id', destination_id).gte('start_date', oneYearAgo).limit(20),
      ibge ? svc.from('mapa_turismo_municipios').select('*').eq('ibge_code', ibge).maybeSingle() : Promise.resolve({ data: null }),
      ibge ? svc.from('cadunico_municipio_cache').select('*').eq('ibge_code', ibge).maybeSingle() : Promise.resolve({ data: null }),
      svc.from('municipal_socioeconomic_context').select('*').eq('destination_id', destination_id).maybeSingle(),
    ]);

    const anac = (anacR as any).data;
    const anatel = (anatelR as any).data;
    const events = (eventsR as any).data || [];
    const mapa = (mapaR as any).data;
    const cadunico = (cadunicoR as any).data;
    const ctx = (ctxR as any).data;

    // Air connectivity score 1-5
    let air_score = 1;
    let nearest_airport: string | null = null;
    if (anac) {
      const pax = anac.passengers_total ?? anac.total_passengers ?? null;
      nearest_airport = anac.airport_name ?? anac.iata_code ?? null;
      if (pax != null) {
        if (pax > 5_000_000) air_score = 5;
        else if (pax > 1_000_000) air_score = 4;
        else if (pax > 200_000) air_score = 3;
        else if (pax > 50_000) air_score = 2;
      } else if (nearest_airport) air_score = 3;
    }

    // Connectivity (telecom) score 1-5
    let telecom_score = 1;
    if (anatel) {
      const has4g = !!(anatel as any).has_4g;
      const has5g = !!(anatel as any).has_5g;
      const operators = ((anatel as any).operators_count ?? 0) as number;
      telecom_score = 1 + (has4g ? 1 : 0) + (has5g ? 2 : 0) + Math.min(1, operators / 4);
      telecom_score = Math.max(1, Math.min(5, Math.round(telecom_score * 10) / 10));
    }

    // Events density
    const events_12m = events.length;

    // Tourism region & MTur
    const mapa_category = mapa?.categoria || mapa?.category || null;

    // Recommendations
    const recommendations: string[] = [];
    if (air_score <= 2) recommendations.push('Conectividade aérea limitada: priorizar parcerias com operadores rodoviários e marketing para mercados emissores próximos.');
    if (telecom_score <= 2) recommendations.push('Cobertura de telecom fraca: investir em Wi-Fi de alta capacidade e backup 4G/5G.');
    if (events_12m < 3) recommendations.push('Baixo volume de eventos no destino: considerar pacotes próprios para criar demanda.');
    if (!mapa) recommendations.push('Município não está no Mapa do Turismo MTur: pode dificultar acesso a editais e fomento federal.');

    const analysis = {
      destination: { name: dest.name, uf: dest.uf, ibge_code: ibge, tourism_region: dest.tourism_region, has_pdt: dest.has_pdt },
      air_connectivity: anac ? {
        score: air_score,
        airport: nearest_airport,
        passengers_total: anac.passengers_total ?? anac.total_passengers ?? null,
        ref_year: anac.ref_year ?? null,
      } : { score: 1, airport: null, passengers_total: null, ref_year: null },
      telecom_coverage: anatel ? {
        score: telecom_score,
        has_4g: !!(anatel as any).has_4g,
        has_5g: !!(anatel as any).has_5g,
        operators_count: (anatel as any).operators_count ?? null,
      } : { score: 1, has_4g: false, has_5g: false, operators_count: null },
      events_12m: { count: events_12m, samples: events.slice(0, 5) },
      mtur: mapa ? { category: mapa_category, in_mapa: true, raw: mapa } : { category: null, in_mapa: false },
      socioeconomic: ctx || null,
      cadunico: cadunico || null,
      recommendations,
      summary: `Conectividade aérea ${air_score}/5, telecom ${telecom_score}/5, ${events_12m} eventos no último ano. ${mapa ? 'Município no Mapa do Turismo.' : 'Município fora do Mapa do Turismo.'}`,
    };

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('search-destination-context error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});