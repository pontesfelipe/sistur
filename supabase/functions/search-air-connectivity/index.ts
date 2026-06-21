import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function classifyConnectivity(flights_per_week: number) {
  if (flights_per_week >= 200) return { tier: 'hub', score: 100 };
  if (flights_per_week >= 70)  return { tier: 'forte', score: 80 };
  if (flights_per_week >= 20)  return { tier: 'media', score: 60 };
  if (flights_per_week >= 5)   return { tier: 'baixa', score: 35 };
  if (flights_per_week > 0)    return { tier: 'minima', score: 15 };
  return { tier: 'sem_conexao', score: 0 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { destinationId } = await req.json();
    if (!destinationId) throw new Error('destinationId obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: dest, error: dErr } = await supabase
      .from('destinations')
      .select('ibge_code, uf, name')
      .eq('id', destinationId)
      .maybeSingle();
    if (dErr) throw dErr;
    if (!dest?.ibge_code) {
      return new Response(JSON.stringify({
        analysis: {
          connectivity_score: 0,
          connectivity_tier: 'sem_dados',
          summary: 'Destino sem código IBGE — não foi possível consultar a ANAC.',
          recommendations: ['Cadastrar código IBGE do destino para habilitar análise ANAC.'],
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: anac } = await supabase
      .from('anac_air_connectivity')
      .select('*')
      .eq('ibge_code', dest.ibge_code)
      .maybeSingle();

    if (!anac) {
      return new Response(JSON.stringify({
        analysis: {
          connectivity_score: 0,
          connectivity_tier: 'sem_aeroporto_proprio',
          municipality: dest.name,
          uf: dest.uf,
          summary: `${dest.name}/${dest.uf} não possui aeroporto registrado na ANAC. Conectividade depende de aeroportos vizinhos.`,
          recommendations: [
            'Mapear distância e tempo até o aeroporto mais próximo (ex.: capital do estado).',
            'Avaliar parcerias com transfers e shuttles para reduzir fricção de acesso.',
          ],
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fpw = Number(anac.flights_per_week ?? 0);
    const { tier, score } = classifyConnectivity(fpw);
    const intlShare = anac.total_flights_12m
      ? (Number(anac.international_flights_12m ?? 0) / Number(anac.total_flights_12m)) * 100
      : 0;

    const recommendations: string[] = [];
    if (score < 35) recommendations.push('Conectividade aérea baixa — explorar campanhas com origens drive-to-destination (raio rodoviário até 500 km).');
    if (intlShare < 1 && score >= 60) recommendations.push('Sem voos internacionais — avaliar parceria com companhias regionais para atrair turistas estrangeiros via conexão.');
    if (anac.airport_count > 1) recommendations.push(`${anac.airport_count} aeroportos no município — diversificar oferta de OTAs por terminal.`);
    if (recommendations.length === 0) recommendations.push('Conectividade aérea saudável — manter monitoramento trimestral da ANAC.');

    const analysis = {
      connectivity_score: score,
      connectivity_tier: tier,
      municipality: dest.name,
      uf: dest.uf,
      airport_count: anac.airport_count,
      airport_icao_codes: anac.airport_icao_codes,
      flights_per_week: fpw,
      total_flights_12m: anac.total_flights_12m,
      total_passengers_12m: anac.total_passengers_12m,
      international_flights_share_pct: Number(intlShare.toFixed(1)),
      reference_period: { start: anac.reference_period_start, end: anac.reference_period_end },
      source_url: anac.data_source_url,
      recommendations,
      summary: `Conectividade ${tier} (${score}/100) com ${fpw} voos/semana e ${anac.total_passengers_12m?.toLocaleString('pt-BR') ?? 0} passageiros nos últimos 12 meses.`,
    };

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});