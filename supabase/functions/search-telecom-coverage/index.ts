import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Bloco 19 — Conectividade Telecom (Anatel)
 * Lê `anatel_coverage_cache` por município e deriva o score composto
 * `ENT_CONECTIVIDADE_TELECOM` a partir de cobertura 4G, 5G e Wi-Fi público.
 */
function compositeScore(c4g: number, c5g: number, wifi: number): number {
  // Pesos: 50% 4G (baseline obrigatório), 30% 5G (diferencial), 20% Wi-Fi público.
  const score = c4g * 0.5 + c5g * 0.3 + wifi * 0.2;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function tierFromScore(s: number): string {
  if (s >= 80) return 'excelente';
  if (s >= 60) return 'boa';
  if (s >= 40) return 'media';
  if (s >= 20) return 'baixa';
  return 'critica';
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
        no_data: true,
        reason: 'Destino sem código IBGE — Anatel não pode ser consultada.',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: anatel } = await supabase
      .from('anatel_coverage_cache')
      .select('*')
      .eq('ibge_code', dest.ibge_code)
      .maybeSingle();

    if (!anatel) {
      return new Response(JSON.stringify({
        no_data: true,
        reason: `Município ${dest.name}/${dest.uf} ainda não está no cache Anatel (anatel_coverage_cache). Sincronize a ingestão Anatel para habilitar.`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const c4g = Number(anatel.coverage_4g_pct ?? 0);
    const c5g = Number(anatel.coverage_5g_pct ?? 0);
    const wifi = Number(anatel.wifi_public_score ?? 0);
    const score = compositeScore(c4g, c5g, wifi);
    const tier = tierFromScore(score);

    const recommendations: string[] = [];
    if (c4g < 80) recommendations.push('Cobertura 4G abaixo de 80% — orientar hóspedes sobre limites de roaming/dados.');
    if (c5g < 20) recommendations.push('5G ainda incipiente — não depender de check-in mobile sem fallback Wi-Fi.');
    if (wifi < 40) recommendations.push('Wi-Fi público fraco no município — reforçar Wi-Fi próprio em áreas comuns.');
    if (score >= 80) recommendations.push('Conectividade telecom excelente — viabiliza PMS cloud, OTA mobile e check-in digital.');

    const analysis = {
      telecom_score: score,
      telecom_tier: tier,
      coverage_4g_pct: c4g,
      coverage_5g_pct: c5g,
      wifi_public_score: wifi,
      reference_year: anatel.reference_year,
      municipality: dest.name,
      uf: dest.uf,
      source: anatel.source ?? 'Anatel',
      recommendations,
      summary: `Conectividade telecom ${tier} (${score}/100): 4G ${c4g.toFixed(0)}% · 5G ${c5g.toFixed(0)}% · Wi-Fi público ${wifi.toFixed(0)}/100.`,
    };

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});