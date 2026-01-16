import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destinationName, methodology, reportContent, issues, prescriptions } = await req.json();

    console.log(`Generating project structure for ${destinationName} using ${methodology}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const methodologyDescriptions: Record<string, string> = {
      waterfall: `Waterfall methodology with sequential phases: Initiation, Planning, Execution, Monitoring, and Closure. Each phase must be completed before the next begins.`,
      safe: `SAFe (Scaled Agile Framework) with Program Increments (PIs) typically lasting 8-12 weeks, composed of 4-5 sprints. Focus on alignment, transparency, and execution.`,
      scrum: `Scrum methodology with sprints of 2-4 weeks. Focus on iterative delivery, daily standups, sprint reviews and retrospectives.`,
      kanban: `Kanban methodology with continuous flow, WIP limits, and visual management. Focus on reducing cycle time and improving throughput.`,
    };

    const systemPrompt = `You are a project management expert specialized in tourism destination development. Your task is to analyze diagnostic data and generate a comprehensive project structure.

Based on the methodology "${methodology}":
${methodologyDescriptions[methodology] || ''}

Generate a project structure that addresses the issues and implements the prescriptions from the diagnostic assessment.

IMPORTANT: Respond with ONLY a valid JSON object. Do not include any markdown, code blocks, or explanatory text.`;

    const userPrompt = `Analyze the following diagnostic data for destination "${destinationName}" and generate a project structure:

## Report Summary
${reportContent?.substring(0, 3000) || 'No report content available'}

## Issues Identified (${issues?.length || 0})
${issues?.slice(0, 10).map((i: any) => `- [${i.pillar}] ${i.title || i.description?.substring(0, 100)}`).join('\n') || 'No issues'}

## Prescriptions (${prescriptions?.length || 0})
${prescriptions?.slice(0, 10).map((p: any) => `- [${p.pillar}] ${p.what}: ${p.how?.substring(0, 100)}`).join('\n') || 'No prescriptions'}

Generate a JSON structure with:
1. "description": A brief project description (2-3 sentences)
2. "phases": Array of phases appropriate for ${methodology}, each with "name", "description", and "deliverables" array
3. "tasks": Array of 10-20 initial tasks derived from issues and prescriptions, each with "title", "description", "type" (epic/feature/story/task), "priority" (low/medium/high/critical), "estimatedHours", and "tags" array
4. "milestones": Array of 3-5 key milestones with "name", "description", and suggested "targetDate" (as ISO date string, starting from today)

Focus on actionable, measurable tasks that address the identified issues.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("AI Response received, parsing...");

    // Parse the JSON response
    let structure;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structure = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw content:", content?.substring(0, 500));
      
      // Return a default structure if parsing fails
      structure = {
        description: `Projeto de desenvolvimento turístico para ${destinationName}`,
        phases: [
          { name: "Diagnóstico", description: "Análise inicial e planejamento", deliverables: ["Plano de ação"] },
          { name: "Implementação", description: "Execução das ações prioritárias", deliverables: ["Ações implementadas"] },
          { name: "Monitoramento", description: "Acompanhamento de resultados", deliverables: ["Relatório de progresso"] },
        ],
        tasks: issues?.slice(0, 10).map((issue: any, idx: number) => ({
          title: issue.title || `Tarefa ${idx + 1}`,
          description: issue.description || "",
          type: "task",
          priority: issue.severity === "CRITICO" ? "critical" : issue.severity === "MODERADO" ? "high" : "medium",
          estimatedHours: 8,
          tags: [issue.pillar],
        })) || [],
        milestones: [
          { name: "Kickoff", description: "Início do projeto", targetDate: new Date().toISOString().split('T')[0] },
          { name: "Primeira entrega", description: "Conclusão da primeira fase", targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        ],
      };
    }

    console.log("Project structure generated successfully");

    return new Response(
      JSON.stringify({ structure }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating project structure:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
