// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Mapping of enterprise_profiles.*_analysis columns to indicator codes and field extractors.
// Each entry maps to one or more ENT_* indicator codes with the JSONB path inside the analysis.
type Extractor = (a: any) => number | null | undefined;
const ANALYSIS_MAP: Record<string, Record<string, Extractor>> = {
  review_analysis: {
    ENT_REVIEW_SCORE: (a) => a?.review_score,
    ENT_REVIEW_VOL: (a) => a?.review_count,
    ENT_NPS: (a) => {
      if (a?.review_score == null) return null;
      // NPS proxy: scale 0-5 → -100..100 (same heuristic used by BusinessReviewSearch)
      const s = Number(a.review_score);
      if (!Number.isFinite(s)) return null;
      return Math.round(((s / 5) * 200) - 100);
    },
  },
  digital_presence_analysis: {
    ENT_TECH_SCORE: (a) => a?.digital_maturity_score,
    ENT_CONVERSAO_DIRETA: (a) => a?.direct_channel_estimate_pct,
  },
  context_analysis: {
    ENT_CONECTIVIDADE_AEREA: (a) => a?.air_connectivity?.score,
    ENT_CONECTIVIDADE_TELECOM: (a) => a?.telecom_coverage?.score,
  },
  complaints_analysis: {
    ENT_REPUTACAO_PUBLICA: (a) => a?.public_reputation_score,
    ENT_TAXA_SOLUCAO_RECLAMACOES: (a) => a?.reclame_aqui?.solved_pct,
  },
  sustainability_analysis: {
    ENT_SUSTENTABILIDADE_SCORE: (a) => a?.sustainability_score,
    ENT_ACESSIBILIDADE_SCORE: (a) => a?.accessibility_score,
  },
  pricing_analysis: {
    ENT_DIARIA_MEDIA: (a) => a?.own_property?.avg,
    ENT_INDICE_PRECO: (a) => a?.pricing_index,
  },
  events_analysis: {
    ENT_EVENTOS_DENSIDADE: (a) => a?.event_density_score,
  },
  safety_analysis: {
    ENT_SEGURANCA_SCORE: (a) => a?.safety_score,
  },
  climate_analysis: {
    ENT_CONFORTO_CLIMATICO: (a) => a?.climate_comfort_score,
  },
  transport_analysis: {
    ENT_TRANSPORTE_COBERTURA: (a) => a?.coverage_score,
  },
  brand_strength_analysis: {
    ENT_FORCA_MARCA: (a) => a?.brand_strength_score,
  },
  demand_trends_analysis: {
    ENT_DEMANDA_INTERESSE: (a) => a?.demand_score,
  },
  consolidated_reputation_analysis: {
    ENT_REPUTACAO_CONSOLIDADA: (a) => a?.consolidated_score,
  },
  social_media_analysis: {
    ENT_PRESENCA_DIGITAL: (a) => a?.presence_score,
  },
  air_connectivity_analysis: {
    ENT_CONECTIVIDADE_AEREA: (a) => a?.connectivity_score,
  },
  tariff_seasonality_analysis: {
    ENT_SAZONALIDADE_TARIFARIA: (a) => a?.seasonality_score,
  },
  telecom_coverage_analysis: {
    ENT_CONECTIVIDADE_TELECOM: (a) => a?.telecom_score,
  },
  urban_accessibility_analysis: {
    ENT_ACESSIBILIDADE_SCORE: (a) => a?.accessibility_score,
  },
  health_infrastructure_analysis: {
    ENT_SAUDE_ENTORNO: (a) => a?.health_score,
  },
};

// Friendly source label per analysis column (no scraping-provider names)
const SOURCE_LABEL: Record<string, string> = {
  review_analysis: 'Reviews Online — Google/TripAdvisor/Booking (Auto)',
  digital_presence_analysis: 'Presença Digital — site oficial e diretórios (Auto)',
  context_analysis: 'Contexto Territorial — IBGE/ANAC/ANATEL (Auto)',
  complaints_analysis: 'Reclame Aqui / Procon (Auto)',
  sustainability_analysis: 'Sinais de Sustentabilidade — fontes públicas (Auto)',
  pricing_analysis: 'OTAs — preço comparado (Auto)',
  events_analysis: 'Agenda Cultural Local (Auto)',
  safety_analysis: 'Segurança Turística — fontes públicas (Auto)',
  climate_analysis: 'Open-Meteo ERA5 — 5 anos (Auto)',
  transport_analysis: 'Transporte Local — busca pública (Auto)',
  brand_strength_analysis: 'Busca pública e mídia (Auto)',
  demand_trends_analysis: 'Tendências de demanda — busca pública (Auto)',
  consolidated_reputation_analysis: 'Booking + Google + TripAdvisor + Airbnb (Auto)',
  social_media_analysis: 'Instagram / Facebook / TikTok (Auto)',
  air_connectivity_analysis: 'ANAC — Voos e Passageiros 12m (Auto)',
  tariff_seasonality_analysis: 'Derivado: Demanda + Eventos + ADR (Auto)',
  telecom_coverage_analysis: 'ANATEL — cobertura 4G/5G/Wi-Fi (Auto)',
  urban_accessibility_analysis: 'Acessibilidade Urbana — busca pública (5 dimensões, Auto)',
  health_infrastructure_analysis: 'DATASUS / CNES (Auto)',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { assessment_id } = await req.json().catch(() => ({}));
    if (!assessment_id || typeof assessment_id !== 'string') {
      return new Response(JSON.stringify({ error: 'assessment_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load assessment (must be enterprise & user must have access via RLS-equivalent check on org)
    const { data: assessment, error: aErr } = await admin
      .from('assessments')
      .select('id, org_id, destination_id, diagnostic_type, status')
      .eq('id', assessment_id)
      .single();
    if (aErr || !assessment) {
      return new Response(JSON.stringify({ error: 'Assessment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (assessment.diagnostic_type !== 'enterprise') {
      return new Response(JSON.stringify({ error: 'Only enterprise diagnostics supported' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Access check: user must be a member of the org (via profiles) OR ADMIN
    const { data: prof } = await admin
      .from('profiles').select('org_id').eq('user_id', user.id).maybeSingle();
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'ADMIN' });
    if (!isAdmin && prof?.org_id !== assessment.org_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load enterprise_profile for this destination + org
    const cols = Object.keys(ANALYSIS_MAP).join(',');
    const { data: profile, error: pErr } = await admin
      .from('enterprise_profiles')
      .select(`id, ${cols}`)
      .eq('destination_id', assessment.destination_id)
      .eq('org_id', assessment.org_id)
      .maybeSingle();
    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: 'Perfil enterprise não encontrado para este destino' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build code → value map from populated analyses
    const collected: Record<string, { value: number; source: string }> = {};
    for (const [col, codeMap] of Object.entries(ANALYSIS_MAP)) {
      const analysis = (profile as any)[col];
      if (!analysis) continue;
      for (const [code, extract] of Object.entries(codeMap)) {
        const v = extract(analysis);
        if (v == null || !Number.isFinite(Number(v))) continue;
        // Last-write-wins for codes mapped from multiple sources (e.g. ENT_ACESSIBILIDADE_SCORE),
        // but dedicated columns override consolidated ones.
        if (!(code in collected) || col.startsWith(code.toLowerCase().replace('ent_', ''))) {
          collected[code] = { value: Number(v), source: SOURCE_LABEL[col] ?? `${col} (Auto)` };
        }
      }
    }

    if (Object.keys(collected).length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Nenhuma análise automática encontrada no perfil para recuperar' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve indicator_id per code
    const codes = Object.keys(collected);
    const { data: catalog } = await admin
      .from('indicators').select('id, code').in('code', codes);
    const idByCode = new Map<string, string>();
    (catalog || []).forEach((row: any) => idByCode.set(row.code, row.id));

    // Read existing values for this assessment to avoid overwriting manual entries or ignored ones
    const { data: existing } = await admin
      .from('indicator_values').select('indicator_id, is_ignored, source')
      .eq('assessment_id', assessment_id);
    const existingByInd = new Map<string, any>();
    (existing || []).forEach((r: any) => existingByInd.set(r.indicator_id, r));

    const upserts: any[] = [];
    const skipped: string[] = [];
    const inserted: string[] = [];
    const updated: string[] = [];

    for (const code of codes) {
      const indicator_id = idByCode.get(code);
      if (!indicator_id) { skipped.push(`${code} (sem catálogo)`); continue; }
      const ex = existingByInd.get(indicator_id);
      if (ex?.is_ignored) { skipped.push(`${code} (ignorado pelo usuário)`); continue; }
      const sourceStr = String(ex?.source ?? '');
      const isManual = sourceStr.toLowerCase().includes('manual');
      if (ex && isManual) { skipped.push(`${code} (preenchimento manual preservado)`); continue; }
      upserts.push({
        org_id: assessment.org_id,
        assessment_id,
        indicator_id,
        value_raw: collected[code].value,
        source: collected[code].source,
        collected_at: new Date().toISOString(),
      });
      if (ex) updated.push(code); else inserted.push(code);
    }

    if (upserts.length > 0) {
      const { error: upErr } = await admin
        .from('indicator_values')
        .upsert(upserts, { onConflict: 'assessment_id,indicator_id' });
      if (upErr) {
        return new Response(JSON.stringify({ error: 'Erro ao gravar valores', detail: upErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Reset to DRAFT then trigger calculate-assessment
    await admin.from('assessments').update({ status: 'DRAFT', needs_recalculation: true }).eq('id', assessment_id);

    const calcRes = await fetch(`${supabaseUrl}/functions/v1/calculate-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ assessment_id }),
    });
    const calcOk = calcRes.ok;
    const calcBody = await calcRes.text().catch(() => '');

    return new Response(JSON.stringify({
      ok: true,
      inserted_codes: inserted,
      updated_codes: updated,
      skipped,
      recalculated: calcOk,
      calc_status: calcRes.status,
      calc_body_preview: calcBody.slice(0, 500),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});