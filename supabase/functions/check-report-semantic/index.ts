// Auditor da camada semântica — versão em lotes (v1.66.9).
// Em vez de uma única chamada gigante ao Gemini com TODAS as regras + relatório inteiro,
// agora executamos:
//   1) checagens DETERMINÍSTICAS em código (estrutura, formatação BR/ABNT, régua oficial,
//      anti-ranking, IGMA expandida, marcas de truncagem) — sem custo de IA.
//   2) checagens LLM por LOTES de regras agrupadas por categoria, em PARALELO. Cada lote
//      avalia ~6 regras de uma vez, com prompt focado, reduzindo risco de o modelo "pular"
//      regras e evitando estouro de contexto conforme a camada semântica cresce.
// O front continua chamando o mesmo endpoint e recebe o mesmo schema de resposta
// (ok / truncated / report_chars / rules_evaluated / result {summary, score, findings[]}).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdmin, corsHeaders } from "../_shared/auth.ts";

type Status = "pass" | "warn" | "fail";
type Finding = {
  rule_key: string;
  rule_title: string;
  status: Status;
  evidence: string | null;
  explanation: string;
  suggested_fix: string | null;
};

const MAX_REPORT_CHARS = 60000;
const RULES_PER_BATCH = 6;
const LLM_TIMEOUT_MS = 45_000;
const MAX_PARALLEL = 6;

// ---------------------------------------------------------------------------
// Checagens determinísticas (sem IA). Cada uma gera um Finding "sintético".
// ---------------------------------------------------------------------------
function deterministicChecks(reportText: string): Finding[] {
  const findings: Finding[] = [];
  const sample = (s: string) => s.slice(0, 240);

  // 1) Marcas de truncagem residuais
  const truncMarkers = /(stop_reason\s*[:=]\s*"?max_tokens|finish_reason\s*[:=]\s*"?length|\[TRUNCADO|\.\.\.\s*\[continua\]|TODO|TBD|\bLOREM IPSUM\b)/i;
  const tm = reportText.match(truncMarkers);
  findings.push({
    rule_key: "structural.no_truncation_markers",
    rule_title: "Sem marcas de truncagem ou placeholders",
    status: tm ? "fail" : "pass",
    evidence: tm ? sample(reportText.slice(Math.max(0, tm.index! - 60), tm.index! + 180)) : null,
    explanation: tm
      ? "Foram encontradas marcas que indicam que o relatório foi cortado ou contém placeholder (ex.: max_tokens, TODO, [TRUNCADO])."
      : "Nenhuma marca de truncagem encontrada.",
    suggested_fix: tm ? "Regerar o relatório (a chamada original ao modelo terminou por limite de tokens)." : null,
  });

  // 2) Tabelas markdown duplicadas (mesmo cabeçalho repetido literalmente)
  const tableHeaders = Array.from(reportText.matchAll(/^\|.+\|\s*\n\|[-:\s|]+\|\s*$/gm)).map((m) => m[0].trim());
  const dupHeader = tableHeaders.find((h, i) => tableHeaders.indexOf(h) !== i);
  findings.push({
    rule_key: "structural.no_duplicate_tables",
    rule_title: "Tabelas não duplicadas",
    status: dupHeader ? "warn" : "pass",
    evidence: dupHeader ? sample(dupHeader) : null,
    explanation: dupHeader
      ? "Detectado cabeçalho de tabela idêntico aparecendo mais de uma vez — possível duplicação."
      : "Sem cabeçalhos de tabela repetidos.",
    suggested_fix: dupHeader ? "Verificar se a mesma tabela foi colada duas vezes (típico de retry parcial)." : null,
  });

  // 3) Classificação fora da régua oficial
  const officialLabels = ["CRÍTICO", "ATENÇÃO", "ADEQUADO", "FORTE", "EXCELENTE"];
  const forbiddenLabels = /(ruim|péssimo|mediano|regular|ótimo|excelência)\b/gi;
  const badLabels = Array.from(reportText.matchAll(forbiddenLabels)).slice(0, 3);
  // só dispara se NÃO estiver acompanhado de um rótulo oficial próximo
  const hasAnyOfficial = officialLabels.some((l) => reportText.includes(l));
  const labelStatus: Status = badLabels.length > 0 && !hasAnyOfficial ? "warn" : "pass";
  findings.push({
    rule_key: "classification.official_scale_only",
    rule_title: "Régua de classificação oficial (CRÍTICO/ATENÇÃO/ADEQUADO/FORTE/EXCELENTE)",
    status: labelStatus,
    evidence: labelStatus !== "pass" ? sample(badLabels.map((m) => m[0]).join(", ")) : null,
    explanation: labelStatus !== "pass"
      ? "O texto usa rótulos qualitativos fora da régua oficial sem âncora nos níveis canônicos."
      : "Régua oficial respeitada (ou texto não usa classificações qualitativas).",
    suggested_fix: labelStatus !== "pass" ? "Substituir por um dos 5 rótulos oficiais com a faixa numérica correspondente." : null,
  });

  // 4) Formatação BR de moeda — proibir R$ com ponto decimal
  const brCurrencyWrong = reportText.match(/R\$\s?[\d.]+\.\d{2}\b/);
  findings.push({
    rule_key: "formatting.brl_canonical",
    rule_title: "Formatação BRL (R$ 1.234,56)",
    status: brCurrencyWrong ? "fail" : "pass",
    evidence: brCurrencyWrong ? sample(brCurrencyWrong[0]) : null,
    explanation: brCurrencyWrong
      ? "Valor monetário em R$ usando ponto decimal (padrão US). Brasil usa vírgula decimal e ponto de milhar."
      : "Sem valores R$ no formato US detectados.",
    suggested_fix: brCurrencyWrong ? "Reescrever como R$ 1.234,56." : null,
  });

  // 5) IGMA expandida na primeira ocorrência
  const igmaIdx = reportText.indexOf("IGMA");
  let igmaStatus: Status = "pass";
  let igmaEvidence: string | null = null;
  if (igmaIdx >= 0) {
    const window = reportText.slice(Math.max(0, igmaIdx - 200), igmaIdx + 200);
    const expanded = /(Índice de Gestão Municipal Avançada|Índice de Governança Municipal Avançada|Índice .{0,80}IGMA)/i.test(window);
    if (!expanded) {
      igmaStatus = "warn";
      igmaEvidence = sample(window);
    }
  }
  findings.push({
    rule_key: "glossary.IGMA_expansion",
    rule_title: "IGMA expandida na primeira ocorrência",
    status: igmaStatus,
    evidence: igmaEvidence,
    explanation: igmaStatus === "warn"
      ? "A sigla IGMA aparece sem expansão por extenso ao redor da primeira ocorrência."
      : "IGMA está expandida ou não aparece no texto.",
    suggested_fix: igmaStatus === "warn" ? "Expandir a sigla na primeira menção: 'IGMA (Índice ...)'." : null,
  });

  // 6) Anti-ranking entre municípios
  const rankingPattern = /(melhor|pior|primeiro lugar|último lugar|ranking|top\s?\d+)\s+(do estado|da região|do brasil|entre municípios)/i;
  const rk = reportText.match(rankingPattern);
  findings.push({
    rule_key: "sources.no_public_ranking",
    rule_title: "Sem ranking público entre municípios",
    status: rk ? "fail" : "pass",
    evidence: rk ? sample(rk[0]) : null,
    explanation: rk
      ? "Texto faz comparação de ranking entre destinos, vedada pela política SISTUR (foco individual por destino)."
      : "Sem comparações de ranking detectadas.",
    suggested_fix: rk ? "Reformular para descrever o destino isoladamente, sem ordená-lo contra outros." : null,
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Checagens determinísticas específicas do modo Enterprise.
// ---------------------------------------------------------------------------
function enterpriseDeterministicChecks(reportText: string): Finding[] {
  const findings: Finding[] = [];
  const sample = (s: string) => s.slice(0, 240);

  // E1) NPS fora da escala oficial (-100 a +100). Captura "NPS de 85/100" ou "NPS 0-100".
  const npsOutOfScale = reportText.match(/NPS[^.\n]{0,40}(?:de\s+)?\d{1,3}\s*\/\s*100\b/i)
    || reportText.match(/NPS[^.\n]{0,30}escala\s+0\s*[-–]\s*100/i);
  findings.push({
    rule_key: "enterprise.nps_scale",
    rule_title: "NPS na escala oficial (-100 a +100)",
    status: npsOutOfScale ? "fail" : "pass",
    evidence: npsOutOfScale ? sample(npsOutOfScale[0]) : null,
    explanation: npsOutOfScale
      ? "NPS apresentado em escala 0-100. A escala oficial é -100 a +100."
      : "Sem indícios de NPS fora da escala oficial.",
    suggested_fix: npsOutOfScale ? "Reapresentar o NPS como inteiro entre -100 e +100." : null,
  });

  // E2) Glossário operacional: siglas usadas sem expansão na primeira ocorrência.
  const acros = [
    { sigla: "ADR", extenso: /(Average Daily Rate|Diária Média)/i },
    { sigla: "RevPAR", extenso: /(Revenue per Available Room|Receita por UH)/i },
    { sigla: "GOP", extenso: /(Gross Operating Profit|Lucro Operacional Bruto)/i },
    { sigla: "NPS", extenso: /(Net Promoter Score|Índice de Recomendação)/i },
  ];
  const missing: string[] = [];
  for (const a of acros) {
    const re = new RegExp(`\\b${a.sigla}\\b`);
    const idx = reportText.search(re);
    if (idx < 0) continue;
    const window = reportText.slice(Math.max(0, idx - 200), idx + 200);
    if (!a.extenso.test(window)) missing.push(a.sigla);
  }
  findings.push({
    rule_key: "enterprise.glossary_expansion",
    rule_title: "Glossário Enterprise — siglas expandidas na 1ª ocorrência",
    status: missing.length === 0 ? "pass" : "warn",
    evidence: missing.length ? `Sem expansão: ${missing.join(", ")}` : null,
    explanation: missing.length
      ? "Siglas operacionais aparecem sem expansão por extenso ao redor da primeira ocorrência."
      : "Todas as siglas operacionais detectadas estão expandidas (ou não aparecem).",
    suggested_fix: missing.length ? `Expandir na primeira menção: ${missing.map((s) => `${s} (…)`).join(", ")}.` : null,
  });

  // E3) Privacidade — nomes/CNPJ de concorrentes individualizados.
  const cnpjPattern = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
  const competitorNamed = reportText.match(/concorrente\s+(?:[A-ZÁÉÍÓÚÂÊÔ][\wÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç&.\- ]{2,40})/);
  const cnpj = reportText.match(cnpjPattern);
  const hasIssue = !!cnpj || (competitorNamed && !/concorrente\s+[A-C]\b/.test(competitorNamed[0]));
  findings.push({
    rule_key: "enterprise.competitor_privacy",
    rule_title: "Privacidade — concorrentes não individualizados",
    status: hasIssue ? "fail" : "pass",
    evidence: hasIssue ? sample((cnpj?.[0] ?? "") + " " + (competitorNamed?.[0] ?? "")) : null,
    explanation: hasIssue
      ? "Detectado nome próprio de concorrente e/ou CNPJ no corpo do relatório. Comparações devem ser agregadas."
      : "Sem nomes próprios ou CNPJs de concorrentes individualizados.",
    suggested_fix: hasIssue ? "Substituir por 'concorrente A/B/C' ou 'mediana do conjunto comparativo'." : null,
  });

  // E4) Ranking entre empreendimentos.
  const entRanking = reportText.match(/(1º|primeiro|melhor|líder)\s+(?:lugar\s+)?(?:da|do)\s+(cidade|região|destino|segmento)/i)
    || reportText.match(/top\s?\d+\s+(?:hotéis|pousadas|empreendimentos)/i);
  findings.push({
    rule_key: "enterprise.no_competitor_ranking",
    rule_title: "Sem ranking público entre empreendimentos",
    status: entRanking ? "fail" : "pass",
    evidence: entRanking ? sample(entRanking[0]) : null,
    explanation: entRanking
      ? "Texto ordena o empreendimento contra concorrentes (ranking vedado em modo Enterprise)."
      : "Sem ranking competitivo detectado.",
    suggested_fix: entRanking ? "Substituir por gap percentual contra mediana/p25/p75 do conjunto comparativo." : null,
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Lote LLM: avalia um pequeno grupo de regras contra o relatório.
// ---------------------------------------------------------------------------
async function runLlmBatch(
  apiKey: string,
  rules: any[],
  reportText: string,
  reportName: string | null,
  truncated: boolean,
  batchLabel: string,
): Promise<Finding[]> {
  const rulesBlock = rules.map((r: any, i: number) => {
    return `### Regra ${i + 1} — [${r.category}] ${r.title}\n` +
      `Chave: ${r.key}\n` +
      (r.section_header ? `Cabeçalho: ${r.section_header}\n` : "") +
      `Conteúdo:\n${r.content}`;
  }).join("\n\n---\n\n");

  const systemPrompt = `Você é um auditor técnico da metodologia SISTUR (Mario Beni). Avalie se o RELATÓRIO respeita o LOTE de regras abaixo (categoria: ${batchLabel}).

Para CADA regra retorne:
- "pass" = relatório respeita (ou regra não se aplica ao texto)
- "warn" = descumprimento parcial / ambiguidade
- "fail" = violação clara

Quando status for warn/fail, cite EXATAMENTE o trecho do relatório (até 240 caracteres) que motivou a avaliação. Para "pass", evidence = null.

Responda APENAS JSON válido:
{"findings":[{"rule_key":"string","rule_title":"string","status":"pass|warn|fail","evidence":"string|null","explanation":"string","suggested_fix":"string|null"}]}
Sem texto fora do JSON.`;

  const userPrompt = `LOTE DE REGRAS (${rules.length}, categoria=${batchLabel}):\n\n${rulesBlock}\n\n---\n\nRELATÓRIO${reportName ? ` ("${reportName}")` : ""}${truncated ? ` [TRUNCADO para ${MAX_REPORT_CHARS} chars]` : ""}:\n\n${reportText}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } catch (e) {
    clearTimeout(timer);
    return rules.map((r) => ({
      rule_key: r.key,
      rule_title: r.title,
      status: "warn" as Status,
      evidence: null,
      explanation: `Lote '${batchLabel}' não pôde ser avaliado (timeout/erro de rede: ${e instanceof Error ? e.message : String(e)}).`,
      suggested_fix: "Reexecutar a auditoria.",
    }));
  }
  clearTimeout(timer);

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return rules.map((r) => ({
      rule_key: r.key,
      rule_title: r.title,
      status: "warn" as Status,
      evidence: null,
      explanation: `Lote '${batchLabel}' falhou (HTTP ${resp.status}): ${t.slice(0, 160)}`,
      suggested_fix: resp.status === 429 ? "Aguardar alguns segundos e reexecutar." : resp.status === 402 ? "Adicionar créditos ao workspace." : "Reexecutar.",
    }));
  }

  let parsed: any = {};
  try {
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    parsed = { findings: [] };
  }
  const arr: Finding[] = Array.isArray(parsed?.findings) ? parsed.findings : [];

  // Garantir 1 finding por regra; preencher faltantes como "warn"
  const byKey = new Map<string, Finding>();
  for (const f of arr) {
    if (f && typeof f === "object" && f.rule_key) {
      byKey.set(f.rule_key, {
        rule_key: String(f.rule_key),
        rule_title: String(f.rule_title || ""),
        status: (["pass", "warn", "fail"].includes(f.status) ? f.status : "warn") as Status,
        evidence: f.evidence ?? null,
        explanation: String(f.explanation || ""),
        suggested_fix: f.suggested_fix ?? null,
      });
    }
  }
  return rules.map((r) => byKey.get(r.key) ?? {
    rule_key: r.key,
    rule_title: r.title,
    status: "warn" as Status,
    evidence: null,
    explanation: `Modelo não retornou avaliação explícita para esta regra no lote '${batchLabel}'.`,
    suggested_fix: "Reexecutar a auditoria com texto mais curto ou regra reformulada.",
  });
}

// ---------------------------------------------------------------------------
// Pool de paralelismo simples para limitar requisições simultâneas ao gateway.
// ---------------------------------------------------------------------------
async function pooledAll<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Score agregado: pass=1, warn=0.5, fail=0; média ponderada simples × 100.
// ---------------------------------------------------------------------------
function computeScore(findings: Finding[]): number {
  if (findings.length === 0) return 0;
  const sum = findings.reduce((acc, f) => acc + (f.status === "pass" ? 1 : f.status === "warn" ? 0.5 : 0), 0);
  return Math.round((sum / findings.length) * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { reportText, reportName, appliesTo } = await req.json();
    if (!reportText || typeof reportText !== "string" || reportText.trim().length < 30) {
      return new Response(JSON.stringify({ error: "Texto do relatório vazio ou muito curto." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const scopeFilter = ["both"];
    if (appliesTo === "territorial" || appliesTo === "enterprise") scopeFilter.push(appliesTo);
    else scopeFilter.push("territorial", "enterprise");

    const { data: rules, error: rulesErr } = await admin
      .from("report_semantic_entries")
      .select("key, category, title, section_header, content, applies_to, injection_order")
      .eq("active", true)
      .in("applies_to", scopeFilter)
      .order("category", { ascending: true })
      .order("injection_order", { ascending: true });
    if (rulesErr) {
      return new Response(JSON.stringify({ error: "Falha ao carregar regras: " + rulesErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma regra ativa para auditar." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = reportText.length > MAX_REPORT_CHARS;
    const reportForAudit = truncated ? reportText.slice(0, MAX_REPORT_CHARS) : reportText;

    // (1) Determinísticas
    const detFindings = deterministicChecks(reportText);

    // (2) Agrupar regras por categoria e fatiar em lotes
    const byCategory = new Map<string, any[]>();
    for (const r of rules) {
      const k = String(r.category || "geral");
      if (!byCategory.has(k)) byCategory.set(k, []);
      byCategory.get(k)!.push(r);
    }
    const batches: { label: string; rules: any[] }[] = [];
    for (const [cat, list] of byCategory) {
      for (let i = 0; i < list.length; i += RULES_PER_BATCH) {
        const chunk = list.slice(i, i + RULES_PER_BATCH);
        const suffix = list.length > RULES_PER_BATCH ? ` ${Math.floor(i / RULES_PER_BATCH) + 1}` : "";
        batches.push({ label: `${cat}${suffix}`, rules: chunk });
      }
    }

    const tasks = batches.map((b) => () => runLlmBatch(LOVABLE_API_KEY, b.rules, reportForAudit, reportName || null, truncated, b.label));
    const batchResults = await pooledAll(tasks, MAX_PARALLEL);
    const llmFindings = batchResults.flat();

    const findings = [...detFindings, ...llmFindings];
    const score = computeScore(findings);
    const fails = findings.filter((f) => f.status === "fail").length;
    const warns = findings.filter((f) => f.status === "warn").length;
    const passes = findings.filter((f) => f.status === "pass").length;

    const summary = `Auditoria em ${batches.length} lote(s) LLM + ${detFindings.length} checagens determinísticas. ` +
      `${passes} aprovações, ${warns} alertas, ${fails} violações. Conformidade geral: ${score}%.`;

    return new Response(JSON.stringify({
      ok: true,
      truncated,
      report_chars: reportText.length,
      rules_evaluated: findings.length,
      batches: batches.length,
      deterministic_checks: detFindings.length,
      result: { summary, score, findings },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("check-report-semantic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});