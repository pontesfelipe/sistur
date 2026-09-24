import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

    const { suggestions } = await req.json();
    if (!Array.isArray(suggestions) || suggestions.length > 12) {
      return new Response(JSON.stringify({ error: "invalid" }), { status: 400, headers: cors });
    }

    const prompt = `Você é consultor de revenue management hoteleiro. Para cada mês abaixo, escreva UMA frase curta (máx. 25 palavras) em português do Brasil justificando a diária sugerida, sem markdown. Responda somente JSON no formato {"items":[{"month":1,"text":"..."}]}.\n\n${JSON.stringify(suggestions)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (r.status === 429 || r.status === 402) {
      return new Response(JSON.stringify({ error: r.status === 429 ? "rate_limited" : "credits" }), { status: r.status, headers: cors });
    }
    if (!r.ok) throw new Error(`gateway ${r.status}`);
    const j = await r.json();
    const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    return new Response(JSON.stringify({ items: parsed.items ?? [] }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "failed" }), { status: 500, headers: cors });
  }
});
