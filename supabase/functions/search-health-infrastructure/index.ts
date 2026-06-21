import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Bloco 23 — Infraestrutura de Saúde do Entorno
 * Lê `datasus_health_cache` por município e deriva o score composto
 * `ENT_SAUDE_ENTORNO` a partir de leitos/1k hab, presença de hospital e PS 24h.
 *
 * Score: 50% leitos/1k (referência OMS 30 = score 100), 30% pronto-socorro 24h,
 * 20% nº de hospitais (até 5 = saturação).
 */
function compositeScore(opts: { bedsPer1k: number | null; has24h: boolean | null; hospitals: number | null }): number {
  const beds = opts.bedsPer1k ?? 0;
  const bedsScore = Math.min(100, (beds / 3) * 100); // 3 leitos/1k = 100 (referência OMS para população urbana)
  const erScore = opts.has24h === true ? 100 : opts.has24h === false ? 30 : 50;
  const hospitals = opts.hospitals ?? 0;
  const hospitalsScore = Math.min(100, (hospitals / 5) * 100);
  return Math.round(bedsScore * 0.5 + erScore * 0.3 + hospitalsScore * 0.2);
}

function tierFromScore(s: number): string {
  if (s >= 80) return 'forte';
  if (s >= 60) return 'adequada';
  if (s >= 35) return 'limitada';
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

    const { data: dest } = await supabase
      .from('destinations')
      .select('ibge_code, uf, name')
      .eq('id', destinationId)
      .maybeSingle();

    if (!dest?.ibge_code) {
      return new Response(JSON.stringify({
        no_data: true,
        reason: 'Destino sem código IBGE — DATASUS não pode ser consultado.',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: cache } = await supabase
      .from('datasus_health_cache')
      .select('*')
      .eq('ibge_code', dest.ibge_code)
      .maybeSingle();

    if (!cache) {
      return new Response(JSON.stringify({
        no_data: true,
        reason: `Município ${dest.name}/${dest.uf} ainda não está no cache DATASUS (datasus_health_cache). A ingestão CNES ainda precisa ser rodada para este IBGE.`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const bedsPer1k = cache.beds_per_1k_inhabitants != null ? Number(cache.beds_per_1k_inhabitants) : null;
    const has24h: boolean | null = cache.has_24h_emergency ?? null;
    const hospitals = cache.total_hospitals ?? 0;
    const beds = cache.total_beds ?? 0;
    const score = compositeScore({ bedsPer1k, has24h, hospitals });
    const tier = tierFromScore(score);

    const recommendations: string[] = [];
    if (!has24h) recommendations.push('Sem pronto-socorro 24h confirmado — mapear hospital de referência mais próximo e tempo de deslocamento.');
    if ((bedsPer1k ?? 0) < 1.5) recommendations.push('Densidade de leitos abaixo da referência OMS (3/1k) — orientar hóspedes sobre limites de atendimento local.');
    if (hospitals === 0) recommendations.push('Município sem hospital próprio — combinar plano de remoção com cidades vizinhas.');
    if (score >= 80) recommendations.push('Infraestrutura de saúde forte — divulgar como diferencial em campanhas para turismo sênior e famílias.');

    const analysis = {
      health_score: score,
      health_tier: tier,
      municipality: dest.name,
      uf: dest.uf,
      total_hospitals: hospitals,
      total_beds: beds,
      total_establishments: cache.total_establishments ?? null,
      emergency_units: cache.emergency_units ?? null,
      beds_per_1k_inhabitants: bedsPer1k,
      has_24h_emergency: has24h,
      reference_year: cache.reference_year,
      source: cache.source ?? 'DATASUS/CNES',
      recommendations,
      summary: `Infraestrutura de saúde ${tier} (${score}/100): ${hospitals} hospitais, ${beds} leitos${bedsPer1k != null ? ` (${bedsPer1k.toFixed(2)}/1k hab)` : ''}.`,
    };

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});