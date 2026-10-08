// Analisa o catálogo EDU com IA e sugere vínculos treinamento → indicador.
// Nada entra no mapa oficial sem aprovação do ADMIN (edu_mapping_suggestions.status).
import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

const BATCH = 8;
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function askAI(training: any, indicators: any[]) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            indicator_code: { type: "string" },
            confidence: { type: "integer" },
            rationale: { type: "string" },
          },
          required: ["indicator_code", "confidence", "rationale"],
        },
      },
    },
    required: ["matches"],
  };
  const tr = [
    `Título: ${training.title}`,
    `Pilar: ${training.pillar}`,
    training.description && `Descrição: ${String(training.description).slice(0, 800)}`,
    training.ementa && `Ementa: ${String(training.ementa).slice(0, 1500)}`,
    training.objective && `Objetivo: ${String(training.objective).slice(0, 500)}`,
    training.competencias && `Competências: ${JSON.stringify(training.competencias).slice(0, 600)}`,
    training.tags && `Tags: ${JSON.stringify(training.tags).slice(0, 300)}`,
  ].filter(Boolean).join("\n");
  const ind = indicators.map((i) => `${i.code} | ${i.name} | ${i.theme ?? ""} | ${(i.description ?? "").slice(0, 160)}`).join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "Você é curador pedagógico do SISTUR (turismo, metodologia Mario Beni). Dado um treinamento e a lista de indicadores do MESMO pilar, indique apenas indicadores cujo problema o conteúdo do treinamento ajuda diretamente a resolver. No máximo 5. confidence de 0 a 100. rationale em uma frase curta em português, sem markdown. Se nenhum for adequado, retorne lista vazia. Use somente códigos da lista.",
      input: [{ role: "user", content: `TREINAMENTO\n${tr}\n\nINDICADORES (código | nome | tema | descrição)\n${ind}` }],
      text: { format: { type: "json_schema", name: "mapping", strict: true, schema } },
    }),
  });
  if (!res.ok || !res.body) {
    const err: any = new Error(`gateway ${res.status}`);
    err.status = res.status;
    err.body = await res.text();
    throw err;
  }
  let out = "";
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") out += ev.delta;
      } catch { /* ignore */ }
    }
  }
  try { return (JSON.parse(out).matches ?? []) as { indicator_code: string; confidence: number; rationale: string }[]; }
  catch { return []; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const { admin } = auth;

  let mode: "new" | "all" = "new";
  let since: string | null = null;
  try {
    const body = await req.json();
    if (body?.mode === "all") mode = "all";
    if (typeof body?.since === "string") since = body.since; // início da rodada "all"
  } catch { /* defaults */ }

  const [{ data: trainings }, { data: indicators }, { data: log }, { data: mapped }] = await Promise.all([
    admin.from("edu_trainings").select("training_id,title,pillar,description,ementa,objective,competencias,tags,updated_at,created_at").eq("active", true),
    admin.from("indicators").select("code,name,pillar,theme,description"),
    admin.from("edu_mapping_analysis_log").select("training_id,analyzed_at"),
    admin.from("edu_indicator_training_map").select("training_id,indicator_code"),
  ]);
  const logMap = new Map((log ?? []).map((l) => [l.training_id, l.analyzed_at]));
  const mappedSet = new Set((mapped ?? []).map((m) => `${m.training_id}|${m.indicator_code}`));

  // Pendentes: nunca analisados ou alterados depois da última análise (mode=new);
  // mode=all: tudo que não foi analisado desde o início desta rodada.
  const pending = (trainings ?? []).filter((t) => {
    const last = logMap.get(t.training_id);
    if (!last) return true;
    if (mode === "all") return since ? last < since : true;
    const changed = t.updated_at ?? t.created_at;
    return changed && changed > last;
  });

  const batch = pending.slice(0, BATCH);
  let created = 0;
  for (const t of batch) {
    const pool = (indicators ?? []).filter((i) => i.pillar === t.pillar);
    if (pool.length === 0) continue;
    let matches: Awaited<ReturnType<typeof askAI>> = [];
    try {
      matches = await askAI(t, pool);
    } catch (e: any) {
      console.error("sync-edu-indicator-mappings", e?.status, e?.body);
      if (e?.status === 402) return json({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }, 402);
      if (e?.status === 429) return json({ error: "Muitas análises seguidas. Tente novamente em instantes.", remaining: pending.length }, 429);
      if (e?.status === 403) return json({ error: "Acesso à IA bloqueado para este espaço de trabalho." }, 403);
      return json({ error: "Falha ao analisar o catálogo." }, 502);
    }
    const valid = new Set(pool.map((i) => i.code));
    const rows = matches
      .filter((m) => valid.has(m.indicator_code) && !mappedSet.has(`${t.training_id}|${m.indicator_code}`) && m.confidence >= 50)
      .slice(0, 5)
      .map((m) => ({
        training_id: t.training_id,
        indicator_code: m.indicator_code,
        pillar: t.pillar,
        confidence: Math.max(0, Math.min(100, Math.round(m.confidence))),
        rationale: m.rationale.slice(0, 400),
      }));
    if (rows.length) {
      // não reabre sugestões já recusadas/aprovadas
      const { data: ins } = await admin.from("edu_mapping_suggestions")
        .upsert(rows, { onConflict: "training_id,indicator_code", ignoreDuplicates: true }).select("id");
      created += ins?.length ?? 0;
    }
    await admin.from("edu_mapping_analysis_log").upsert({
      training_id: t.training_id, analyzed_at: new Date().toISOString(), suggestions_count: rows.length,
    });
  }

  return json({ analyzed: batch.length, created, remaining: Math.max(0, pending.length - batch.length) });
});
