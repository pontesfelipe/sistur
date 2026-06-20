import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load context
    const { data: project } = await admin
      .from("projects")
      .select("id, name, description, methodology, status, destination:destinations(name, uf), assessment_id")
      .eq("id", project_id).single();
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: links }, { data: phases }, { data: existingTasks }] = await Promise.all([
      admin.from("project_indicator_links").select("indicator_code, indicator_name, baseline_score, target_score, pillar, baseline_status").eq("project_id", project_id),
      admin.from("project_phases").select("id, name").eq("project_id", project_id).order("phase_order"),
      admin.from("project_tasks").select("title").eq("project_id", project_id).limit(100),
    ]);

    const indicatorsText = (links ?? []).map((l: any) =>
      `- [${l.pillar ?? '-'}] ${l.indicator_code} ${l.indicator_name ?? ''} — baseline ${Math.round(Number(l.baseline_score ?? 0) * 100)}% (status ${l.baseline_status ?? 'n/a'}), meta ${Math.round(Number(l.target_score ?? 0.67) * 100)}%`
    ).join("\n") || "(nenhum indicador vinculado)";

    const phasesText = (phases ?? []).map((p: any, i: number) => `${i}: ${p.name} (id=${p.id})`).join("\n") || "(sem fases)";
    const existingText = (existingTasks ?? []).slice(0, 30).map((t: any) => `- ${t.title}`).join("\n") || "(nenhuma)";

    const systemPrompt = `Você é um especialista em gestão de projetos de turismo (metodologia SISTUR de Mario Beni: pilares RA, OE, AO). Sua tarefa é sugerir NOVAS tarefas acionáveis para um projeto existente, evitando duplicar tarefas já cadastradas. Responda APENAS com JSON válido.`;

    const userPrompt = `Projeto: ${project.name}
Metodologia: ${project.methodology}
Destino: ${(project.destination as any)?.name ?? ''} / ${(project.destination as any)?.uf ?? ''}
Descrição: ${project.description ?? '(sem descrição)'}

Indicadores-alvo (do diagnóstico):
${indicatorsText}

Fases disponíveis:
${phasesText}

Tarefas já cadastradas (NÃO duplicar):
${existingText}

Retorne JSON no formato:
{
  "tasks": [
    {
      "title": "string curto e acionável",
      "description": "string com critério de aceitação claro",
      "priority": "low|medium|high|critical",
      "estimated_hours": number,
      "phase_index": number (índice 0-based em Fases disponíveis, ou null),
      "indicator_code": "string (código do indicador que esta tarefa endereça, ou null)",
      "tags": ["string"]
    }
  ]
}

Gere entre 4 e 8 tarefas NOVAS, cobrindo prioritariamente indicadores em status "Crítico" ou "Atenção" ainda não tratados pelas tarefas existentes.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso de IA atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações → Planos." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await aiRes.json();
    const content = payload.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch { parsed = { tasks: [] }; }
    }
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    // Resolve phase_index to phase_id
    const resolved = tasks.map((t: any) => ({
      title: String(t.title ?? "").slice(0, 200),
      description: String(t.description ?? "").slice(0, 2000),
      priority: ["low", "medium", "high", "critical"].includes(t.priority) ? t.priority : "medium",
      estimated_hours: typeof t.estimated_hours === "number" ? t.estimated_hours : null,
      phase_id: typeof t.phase_index === "number" && phases?.[t.phase_index]?.id ? phases[t.phase_index].id : null,
      indicator_code: t.indicator_code ?? null,
      tags: Array.isArray(t.tags) ? t.tags.slice(0, 6).map((x: any) => String(x)) : [],
    })).filter((t: any) => t.title);

    return new Response(JSON.stringify({ suggestions: resolved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("suggest-project-tasks error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});