// Edge function que recebe o texto de um relatório e o confronta com as regras
// ativas da camada semântica (report_semantic_entries). Usa o Lovable AI Gateway
// para retornar um parecer estruturado (compliant/violations/warnings) em JSON.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdmin, corsHeaders } from "../_shared/auth.ts";

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

    const rulesBlock = rules.map((r: any, i: number) => {
      return `### Regra ${i + 1} — [${r.category}] ${r.title}\n` +
        `Chave: ${r.key}\n` +
        (r.section_header ? `Cabeçalho: ${r.section_header}\n` : "") +
        `Conteúdo:\n${r.content}`;
    }).join("\n\n---\n\n");

    const MAX_REPORT_CHARS = 60000;
    const truncated = reportText.length > MAX_REPORT_CHARS;
    const reportForAudit = truncated ? reportText.slice(0, MAX_REPORT_CHARS) : reportText;

    const systemPrompt = `Você é um auditor técnico da metodologia SISTUR (Mario Beni). Sua tarefa é avaliar se um RELATÓRIO está em conformidade com as REGRAS da camada semântica oficial.

Para cada regra:
- "pass"  = o relatório respeita a regra (ou ela não se aplica ao trecho avaliado).
- "warn"  = há indícios de descumprimento parcial, ambiguidade ou risco.
- "fail"  = o relatório claramente viola a regra (ex.: usa categorias fora da régua oficial, faz ranking proibido, inventa dados, ignora pilar).

Sempre cite EXATAMENTE o trecho do relatório (até 240 caracteres) que motivou a avaliação quando o status for "warn" ou "fail". Quando for "pass" não precisa citar trecho.

Responda APENAS em JSON válido no schema:
{
  "summary": "string curta em português",
  "score": number (0 a 100, conformidade geral),
  "findings": [
    {
      "rule_key": "string",
      "rule_title": "string",
      "status": "pass" | "warn" | "fail",
      "evidence": "string ou null",
      "explanation": "string em português",
      "suggested_fix": "string ou null"
    }
  ]
}
Nunca devolva texto fora do JSON.`;

    const userPrompt = `REGRAS DA CAMADA SEMÂNTICA (${rules.length} ativas, escopo=${appliesTo || "todos"}):\n\n${rulesBlock}\n\n---\n\nRELATÓRIO A AUDITAR${reportName ? ` ("${reportName}")` : ""}${truncated ? ` [TRUNCADO para ${MAX_REPORT_CHARS} chars]` : ""}:\n\n${reportForAudit}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da IA. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: "Falha na IA: " + t.slice(0, 300) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      const match = String(content).match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { summary: "Falha ao interpretar resposta da IA.", score: 0, findings: [] };
    }

    return new Response(JSON.stringify({
      ok: true,
      truncated,
      report_chars: reportText.length,
      rules_evaluated: rules.length,
      result: parsed,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("check-report-semantic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});