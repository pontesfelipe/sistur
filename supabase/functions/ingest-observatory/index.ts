// ingest-observatory
// Deriva medições do Observatório a partir das ingestões oficiais existentes
// (Cadastur, ANAC, etc.) que já populam `external_indicator_values`.
// Composes-on, em vez de scrapear novamente — preserva linhagem e provenance.

import { requireAdminOrServiceRole, corsHeaders } from "../_shared/auth.ts";

// Mapeamento: indicator_code externo -> métrica do observatório
// Cada entrada também declara como tratar (sum/last/identity) e source label.
const MAPPINGS: Array<{
  external_indicator: string;
  metric_code: string;
  source_label: string;
}> = [
  // Cadastur: soma de leitos por município (OE001) -> leitos disponíveis
  { external_indicator: "OE001", metric_code: "ocupacao_leitos_disponiveis", source_label: "Cadastur/MTur (auto)" },
  // ANAC: passageiros internacionais por aeroporto consolidado por município
  { external_indicator: "igma_passageiros_internacionais", metric_code: "fluxo_visitantes_internacionais", source_label: "ANAC (auto)" },
  { external_indicator: "igma_passageiros_nacionais", metric_code: "fluxo_visitantes_nacionais", source_label: "ANAC (auto)" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = await requireAdminOrServiceRole(req);
  if (guard instanceof Response) return guard;
  const admin = guard.admin;

  let body: { smoke_test?: boolean; year?: number; month?: number | null } = {};
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

      for (const orgId of orgs) {
        const { error: upErr } = await admin
          .from("observatory_measurements")
          .upsert({
            org_id: orgId,
            metric_id: metricId,
            reference_year: yr,
            reference_month: refMonth,
            value,
            source: map.source_label,
            notes: `Auto-derivado de ${map.external_indicator}`,
          }, { onConflict: "org_id,metric_id,reference_year,reference_month" });
        if (upErr) { failed += 1; } else { inserted += 1; processed += 1; }
      }
    }
    details.push({ metric: map.metric_code, count: inserted });
  }

  return new Response(
    JSON.stringify({ ok: true, processed, failed, reference_year: refYear, reference_month: refMonth, details }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});