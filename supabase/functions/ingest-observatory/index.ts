// ingest-observatory
// Deriva medições do Observatório a partir das ingestões oficiais existentes
// (Cadastur, ANAC, etc.) que já populam `external_indicator_values`.
// Composes-on, em vez de scrapear novamente — preserva linhagem e provenance.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdminOrServiceRole, corsHeaders } from "../_shared/auth.ts";

// Mapeamento: indicator_code externo -> métrica do observatório
// Cada entrada também declara como tratar (sum/last/identity) e source label.
// cadence: "annual" -> month sentinel 12 (snapshot anual); "monthly" -> usa mês corrente
const MAPPINGS: Array<{
  external_indicator: string;
  metric_code: string;
  source_label: string;
  cadence: "annual" | "monthly";
}> = [
  { external_indicator: "OE001", metric_code: "ocupacao_leitos_disponiveis", source_label: "Cadastur/MTur (auto)", cadence: "annual" },
  { external_indicator: "igma_visitantes_internacionais", metric_code: "fluxo_visitantes_internacionais", source_label: "IGMA/ANAC (auto)", cadence: "annual" },
  { external_indicator: "igma_visitantes_nacionais", metric_code: "fluxo_visitantes_nacionais", source_label: "IGMA/ANAC (auto)", cadence: "annual" },
  { external_indicator: "igma_empregos_turismo", metric_code: "empregos_formais", source_label: "CAGED/RAIS via IGMA (auto)", cadence: "annual" },
  { external_indicator: "igma_arrecadacao_turismo", metric_code: "receita_arrecadacao_iss", source_label: "Tesouro/SEFAZ via IGMA (auto)", cadence: "annual" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Auth: aceita (a) ADMIN/service_role via JWT  OU  (b) cabeçalho x-cron-secret válido
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  let authorized = false;
  if (cronHeader) {
    const { data: secretRow } = await admin
      .from("internal_cron_secrets")
      .select("value")
      .eq("name", "ingest_observatory_cron_secret")
      .maybeSingle();
    if (secretRow?.value && secretRow.value === cronHeader) authorized = true;
  }
  if (!authorized) {
    const guard = await requireAdminOrServiceRole(req);
    if (guard instanceof Response) return guard;
  }

  let body: { smoke_test?: boolean; year?: number; month?: number | null; triggered_by?: string; baseline_monthly?: boolean } = {};
  try { body = await req.json(); } catch { /* noop */ }

  if (body.smoke_test) {
    return new Response(
      JSON.stringify({ ok: true, mappings: MAPPINGS.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const now = new Date();
  const refYear = body.year ?? now.getFullYear();
  const refMonth = body.month === undefined ? (now.getMonth() + 1) : body.month;

  // Self-log run em ingestion_runs (cron + manual). Constraint: cron|manual|admin|system
  const allowed = new Set(["cron", "manual", "admin", "system"]);
  const requested = body.triggered_by ?? (cronHeader ? "cron" : "admin");
  const triggeredBy = allowed.has(requested) ? requested : (cronHeader ? "cron" : "admin");
  const { data: runRow } = await admin
    .from("ingestion_runs")
    .insert({
      function_name: "ingest-observatory",
      triggered_by: triggeredBy,
      status: "running",
      metadata: { source: "ingest-observatory", mode: "backfill_annual" },
    })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;
  const startedAt = Date.now();

  // Carrega catálogo de métricas para resolver code -> id
  const { data: metrics, error: mErr } = await admin
    .from("observatory_metrics")
    .select("id, code");
  if (mErr) {
    return new Response(JSON.stringify({ error: mErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const metricByCode = new Map((metrics ?? []).map((m: any) => [m.code, m.id]));

  // Carrega destinations com ibge_code -> org_id
  const { data: destinations, error: dErr } = await admin
    .from("destinations")
    .select("org_id, ibge_code")
    .not("ibge_code", "is", null);
  if (dErr) {
    return new Response(JSON.stringify({ error: dErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Mapa ibge -> [org_ids]
  const ibgeToOrgs = new Map<string, string[]>();
  for (const d of destinations ?? []) {
    const arr = ibgeToOrgs.get(d.ibge_code as string) ?? [];
    arr.push(d.org_id as string);
    ibgeToOrgs.set(d.ibge_code as string, arr);
  }

  let processed = 0;
  let failed = 0;
  const details: Array<{ metric: string; count: number }> = [];

  for (const map of MAPPINGS) {
    const metricId = metricByCode.get(map.metric_code);
    if (!metricId) continue;

    const { data: values, error: vErr } = await admin
      .from("external_indicator_values")
      .select("municipality_ibge_code, raw_value, reference_year")
      .eq("indicator_code", map.external_indicator)
      .not("raw_value", "is", null);

    if (vErr) { failed += 1; continue; }

    let inserted = 0;
    for (const row of values ?? []) {
      const orgs = ibgeToOrgs.get(row.municipality_ibge_code as string);
      if (!orgs || orgs.length === 0) continue;
      const value = Number(row.raw_value);
      if (!Number.isFinite(value)) continue;
      const yr = row.reference_year ?? refYear;
      // Para fontes anuais, fixa mês=12 (snapshot ano-fim) para evitar colisão por NULL no UNIQUE
      const mo = map.cadence === "annual" ? 12 : refMonth;

      for (const orgId of orgs) {
        const { error: upErr } = await admin
          .from("observatory_measurements")
          .upsert({
            org_id: orgId,
            metric_id: metricId,
            reference_year: yr,
            reference_month: mo,
            value,
            source: map.source_label,
            notes: `Auto-derivado de ${map.external_indicator}`,
          }, { onConflict: "org_id,metric_id,reference_year,reference_month" });
        if (upErr) { failed += 1; } else { inserted += 1; processed += 1; }

        // Baseline anualizado: para fontes anuais, distribui valor/12 nos meses 1..11
        // marcando como estimativa. Não sobrescreve valores reais já existentes.
        if (map.cadence === "annual" && body.baseline_monthly !== false) {
          const monthlyEstimate = value / 12;
          for (let m = 1; m <= 11; m++) {
            // Só insere se não existir registro real para esse mês
            const { data: existing } = await admin
              .from("observatory_measurements")
              .select("id, notes")
              .eq("org_id", orgId)
              .eq("metric_id", metricId)
              .eq("reference_year", yr)
              .eq("reference_month", m)
              .maybeSingle();
            if (existing && !(existing.notes ?? "").includes("estimativa mensal")) continue;
            const { error: estErr } = await admin
              .from("observatory_measurements")
              .upsert({
                org_id: orgId,
                metric_id: metricId,
                reference_year: yr,
                reference_month: m,
                value: monthlyEstimate,
                source: `${map.source_label} (estimativa mensal)`,
                notes: `Baseline anualizado: valor anual de ${map.external_indicator} dividido por 12 (estimativa mensal). Será substituído por dado real quando disponível.`,
              }, { onConflict: "org_id,metric_id,reference_year,reference_month" });
            if (estErr) { failed += 1; } else { inserted += 1; processed += 1; }
          }
        }
      }
    }
    details.push({ metric: map.metric_code, count: inserted });
  }

  // Finaliza run
  if (runId) {
    const finalStatus = failed > 0 && processed > 0 ? "partial" : failed > 0 ? "failed" : "success";
    await admin.from("ingestion_runs").update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      records_processed: processed,
      records_failed: failed,
      metadata: { source: "ingest-observatory", details },
    }).eq("id", runId);
  }

  return new Response(
    JSON.stringify({ ok: true, processed, failed, reference_year: refYear, reference_month: refMonth, details }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});