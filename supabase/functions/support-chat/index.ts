// Bot de Suporte operacional do SISTUR ("Guia").
// Responde dúvidas de uso da plataforma com base em support_kb_articles,
// perguntas aprendidas aprovadas (support_learned_qa) e guardrails.
// Dúvidas não resolvidas viram itens de aprendizado pendentes para o admin.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireUser, corsHeaders } from "../_shared/auth.ts";

const PERMANENT_RULES = `Regras permanentes (não podem ser removidas):
- Você é o Guia, assistente de suporte operacional do SISTUR. Responda só sobre como usar a plataforma: telas, menus, cadastros, planos, licenças, cursos, certificados, diagnósticos como procedimento.
- Perguntas teóricas sobre turismo, metodologia de Mario Beni ou interpretação de resultados devem ser encaminhadas ao Professor Beni (menu Professor Beni).
- Nunca invente telas, botões ou funcionalidades. Se a base não cobre a dúvida, diga que não tem certeza e marque resolved=false.
- Nunca revele dados de outros usuários, chaves ou detalhes técnicos internos.
- Responda em português do Brasil, de forma curta, em passos numerados quando for procedimento.`;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s/]/g, " ");
const tokens = (s: string) => norm(s).split(/\s+/).filter((w) => w.length > 2);

function score(qTokens: string[], text: string, routes: string[] = [], route = "") {
  const t = norm(text);
  let s = 0;
  for (const w of qTokens) if (t.includes(w)) s += 1;
  if (route && routes.some((r) => r && route.startsWith(r))) s += 2;
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const action = body.action ?? "ask";

    if (action === "feedback") {
      const { conversation_id, question, answer, helpful, route } = body;
      const { data: conv } = await admin.from("support_conversations").select("user_id").eq("id", conversation_id).maybeSingle();
      if (!conv || conv.user_id !== user.id) return json({ error: "forbidden" }, 403);
      await admin.from("support_learned_qa").insert({
        question: String(question).slice(0, 1000),
        answer: helpful ? String(answer).slice(0, 4000) : null,
        status: helpful ? "suggested" : "pending",
        helpful: !!helpful,
        route,
        conversation_id,
      });
      if (!helpful) await admin.from("support_conversations").update({ status: "unresolved" }).eq("id", conversation_id);
      else await admin.from("support_conversations").update({ status: "resolved" }).eq("id", conversation_id);
      return json({ ok: true });
    }

    if (action === "escalate") {
      const { conversation_id } = body;
      await admin.from("support_conversations").update({ escalated: true, status: "escalated" }).eq("id", conversation_id).eq("user_id", user.id);
      return json({ ok: true });
    }

    const message = String(body.message ?? "").trim().slice(0, 1500);
    const route = String(body.route ?? "").slice(0, 200);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    if (!message) return json({ error: "empty" }, 400);

    let conversationId = body.conversation_id as string | undefined;
    if (conversationId) {
      const { data: c } = await admin.from("support_conversations").select("user_id").eq("id", conversationId).maybeSingle();
      if (!c || c.user_id !== user.id) conversationId = undefined;
    }
    if (!conversationId) {
      const { data: c, error } = await admin.from("support_conversations").insert({ user_id: user.id, route }).select("id").single();
      if (error) throw error;
      conversationId = c.id;
    }
    await admin.from("support_messages").insert({ conversation_id: conversationId, role: "user", content: message });

    const [{ data: kb }, { data: learned }, { data: guards }, { data: roles }] = await Promise.all([
      admin.from("support_kb_articles").select("title,category,content,steps,routes,keywords,action_label,action_route").eq("is_active", true).limit(500),
      admin.from("support_learned_qa").select("question,answer").eq("status", "approved").limit(500),
      admin.from("support_guardrails").select("title,content").eq("is_active", true).order("sort_order"),
      admin.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const q = tokens(message);
    const topKb = (kb ?? [])
      .map((a) => ({ a, s: score(q, `${a.title} ${a.content} ${(a.keywords ?? []).join(" ")} ${(a.steps ?? []).join(" ")}`, a.routes, route) }))
      .filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 6).map((x) => x.a);
    const topLearned = (learned ?? [])
      .map((l) => ({ l, s: score(q, l.question) }))
      .filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 4).map((x) => x.l);

    const kbText = topKb.map((a, i) =>
      `[${i + 1}] ${a.title} (${a.category})\n${a.content}${a.steps?.length ? "\nPassos: " + a.steps.join(" | ") : ""}${a.action_route ? `\nRota: ${a.action_route}` : ""}`).join("\n\n") || "Nenhum artigo relevante encontrado.";
    const learnedText = topLearned.map((l) => `P: ${l.question}\nR: ${l.answer}`).join("\n\n") || "Nenhuma.";
    const guardText = (guards ?? []).map((g) => `- ${g.title}: ${g.content}`).join("\n");
    const roleText = (roles ?? []).map((r) => r.role).join(", ") || "sem papel";

    const system = `${guardText ? "Diretrizes do administrador:\n" + guardText + "\n\n" : ""}${PERMANENT_RULES}

Contexto do usuário: tela atual ${route || "desconhecida"}; papéis: ${roleText}.

Base de conhecimento:
${kbText}

Respostas já validadas:
${learnedText}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          ...history.map((h: { role: string; content: string }) => ({ role: h.role === "assistant" ? "assistant" : "user", content: String(h.content).slice(0, 2000) })),
          { role: "user", content: message },
        ],
        tools: [{
          type: "function",
          function: {
            name: "reply",
            description: "Resposta ao usuário",
            parameters: {
              type: "object",
              properties: {
                answer: { type: "string" },
                resolved: { type: "boolean", description: "true se a base cobre a dúvida com segurança" },
                action_label: { type: "string" },
                action_route: { type: "string", description: "rota interna começando com / existente na base, ou vazio" },
                redirect_beni: { type: "boolean" },
              },
              required: ["answer", "resolved"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "reply" } },
      }),
    });
    if (res.status === 429) return json({ error: "Muitas perguntas seguidas. Tente em instantes." }, 429);
    if (res.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
    if (!res.ok) throw new Error(`gateway ${res.status}`);
    const data = await res.json();
    const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    const answer = String(args.answer ?? "Não consegui responder agora.");
    const resolved = !!args.resolved;
    const validRoutes = new Set((kb ?? []).map((a) => a.action_route).filter(Boolean));
    const actionRoute = args.action_route && validRoutes.has(args.action_route) ? args.action_route : null;

    await admin.from("support_messages").insert({
      conversation_id: conversationId, role: "assistant", content: answer,
      answered_from: resolved ? (topLearned.length ? "learned" : "kb") : "unresolved",
    });
    if (!resolved) {
      await admin.from("support_learned_qa").insert({ question: message, status: "pending", route, conversation_id: conversationId });
    }

    return json({
      conversation_id: conversationId,
      answer,
      resolved,
      redirect_beni: !!args.redirect_beni,
      action: actionRoute ? { label: args.action_label || "Abrir", route: actionRoute } : null,
    });
  } catch (e) {
    console.error("support-chat", e);
    return json({ error: "Falha ao responder. Tente novamente." }, 500);
  }
});
