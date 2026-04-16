import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mirror of the 26-field enterprise profile formatter in generate-report.
// Lets the project AI contextualize prescriptions against the actual operation
// (e.g. seasonal hotel vs year-round resort) instead of producing generic tasks.
function formatEnterpriseProfile(profile: any): string {
  if (!profile) return '';
  const lines: string[] = [];
  if (profile.property_type) lines.push(`- Tipo: ${profile.property_type}`);
  if (profile.star_rating) lines.push(`- Classificação: ${profile.star_rating}★`);
  if (profile.room_count) lines.push(`- UHs: ${profile.room_count}`);
  if (profile.suite_count) lines.push(`- Suítes: ${profile.suite_count}`);
  if (profile.total_capacity) lines.push(`- Capacidade total: ${profile.total_capacity} hóspedes`);
  if (profile.employee_count) lines.push(`- Funcionários: ${profile.employee_count}`);
  if (profile.years_in_operation !== null && profile.years_in_operation !== undefined) {
    lines.push(`- Anos de operação: ${profile.years_in_operation}`);
  }
  if (profile.seasonality) lines.push(`- Sazonalidade: ${profile.seasonality}`);
  if (Array.isArray(profile.peak_months) && profile.peak_months.length > 0) {
    lines.push(`- Meses de alta: ${profile.peak_months.join(', ')}`);
  }
  if (profile.average_occupancy_rate !== null && profile.average_occupancy_rate !== undefined) {
    lines.push(`- Ocupação média: ${profile.average_occupancy_rate}%`);
  }
  if (profile.average_daily_rate !== null && profile.average_daily_rate !== undefined) {
    lines.push(`- ADR médio: R$ ${profile.average_daily_rate}`);
  }
  if (Array.isArray(profile.target_market) && profile.target_market.length > 0) {
    lines.push(`- Público-alvo: ${profile.target_market.join(', ')}`);
  }
  if (Array.isArray(profile.primary_source_markets) && profile.primary_source_markets.length > 0) {
    lines.push(`- Mercados emissores: ${profile.primary_source_markets.join(', ')}`);
  }
  if (Array.isArray(profile.certifications) && profile.certifications.length > 0) {
    lines.push(`- Certificações: ${profile.certifications.join(', ')}`);
  }
  if (Array.isArray(profile.sustainability_initiatives) && profile.sustainability_initiatives.length > 0) {
    lines.push(`- Iniciativas de sustentabilidade: ${profile.sustainability_initiatives.join(', ')}`);
  }
  if (Array.isArray(profile.accessibility_features) && profile.accessibility_features.length > 0) {
    lines.push(`- Recursos de acessibilidade: ${profile.accessibility_features.join(', ')}`);
  }
  if (profile.notes) lines.push(`- Observações: ${profile.notes}`);
  return lines.length > 0 ? lines.join('\n') : '';
}

// Official external benchmarks (IBGE / DATASUS / STN / CADASTUR / INEP / Mapa do
// Turismo). Previously only the report prompt saw these — the project prompt
// had no way to frame tasks against regional baselines.
function formatExternalBenchmarks(externalValues: any[], indicatorsByCode: Map<string, any>): string {
  if (!externalValues || externalValues.length === 0) return '';
  const sourceLabels: Record<string, string> = {
    IBGE_AGREGADOS: 'IBGE (Agregados)',
    IBGE_PESQUISAS: 'IBGE (Pesquisas)',
    DATASUS: 'DATASUS',
    STN: 'STN / Tesouro Nacional',
    CADASTUR: 'CADASTUR',
    INEP: 'INEP',
    MAPA_TURISMO: 'Mapa do Turismo',
  };
  return externalValues.slice(0, 20).map((ev: any) => {
    const indicator = indicatorsByCode.get(ev.indicator_code);
    const indicatorName = indicator?.name || ev.indicator_code;
    const unit = indicator?.unit || '';
    const rawValue = ev.raw_value !== null && ev.raw_value !== undefined
      ? ev.raw_value
      : (ev.raw_value_text || 'N/A');
    const sourceLabel = sourceLabels[ev.source_code] || ev.source_code;
    const year = ev.reference_year ? ` (${ev.reference_year})` : '';
    return `- ${indicatorName}: ${rawValue}${unit ? ` ${unit}` : ''} — ${sourceLabel}${year}`;
  }).join('\n');
}
// Cap how many issues/prescriptions we hand to the LLM. The client MUST use the
// same cap (see src/lib/projectGeneration.ts) so linkedIssueIndex /
// linkedPrescriptionIndex in the AI response map 1:1 back to the real db ids.
// Echoed in the response so the client can detect a mismatch at runtime.
const MAX_AI_ITEMS = 15;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      destinationName,
      methodology,
      reportContent,
      issues,
      prescriptions,
      actionPlans,
      pillarScores,
      indicatorScores,
      // NEW: enterprise + external context that used to be invisible to the
      // project AI — see CreateProjectDialog.tsx for how these are fetched.
      enterpriseProfile,
      externalValues,
    } = await req.json();

    console.log(
      `Generating project structure for ${destinationName} using ${methodology}`,
      `— enterpriseProfile: ${!!enterpriseProfile}, externalValues: ${Array.isArray(externalValues) ? externalValues.length : 0}`,
    );

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

    const systemPrompt = `Você é um especialista em gestão de projetos de desenvolvimento turístico. Sua tarefa é analisar dados de diagnóstico e gerar uma estrutura de projeto abrangente.

Com base na metodologia "${methodology}":
${methodologyDescriptions[methodology] || ''}

Gere uma estrutura de projeto que aborde as questões identificadas e implemente as prescrições da avaliação diagnóstica.

Quando houver seção "## Perfil do Empreendimento", CONTEXTUALIZE cada tarefa à realidade operacional: tipo de empreendimento, sazonalidade (ajustar prazos/fases aos meses de pico), público-alvo/mercados emissores (calibrar prescrições de marketing), certificações e iniciativas de sustentabilidade já existentes (evitar recomendar o que já está implantado).

Quando houver seção "## Benchmarks Externos", use os valores oficiais (IBGE/DATASUS/STN/CADASTUR/INEP) como referência regional nas descrições das tarefas — ancore metas em números comparáveis da região/UF em vez de generalidades.

IMPORTANTE:
- Responda APENAS com um objeto JSON válido. Não inclua markdown, blocos de código ou texto explicativo.
- TODO O CONTEÚDO DEVE ESTAR EM PORTUGUÊS BRASILEIRO (pt-BR).`;

    // Format pillar scores for context
    const pillarScoresText = pillarScores 
      ? Object.entries(pillarScores).map(([pillar, data]: [string, any]) => 
          `- ${pillar}: ${data.score !== undefined ? (data.score * 100).toFixed(1) + '%' : 'N/A'} (${data.severity || 'N/A'})`
        ).join('\n')
      : 'Scores não disponíveis';

    // Format action plans
    const actionPlansText = actionPlans?.length > 0
      ? actionPlans.slice(0, 10).map((ap: any) => `- [${ap.status}] ${ap.title} (Pilar: ${ap.pillar || 'N/A'}, Prazo: ${ap.due_date || 'N/A'})`).join('\n')
      : 'Nenhum plano de ação';

    // Format indicator scores (top critical ones)
    const indicatorScoresText = indicatorScores?.length > 0
      ? indicatorScores
          .filter((is: any) => is.score <= 0.66)
          .slice(0, 15)
          .map((is: any) => {
            const status = is.score <= 0.33 ? 'CRÍTICO' : 'ATENÇÃO';
            return `- ${is.indicator?.name || is.indicator?.code || 'N/A'}: ${(is.score * 100).toFixed(1)}% [${status}] (Pilar: ${is.indicator?.pillar || 'N/A'})`;
          }).join('\n')
      : 'Nenhum indicador crítico';

    // Slice the inputs so we can refer to each one by its index in the prompt.
    // The client maps linkedIssueIndex / linkedPrescriptionIndex back to the real
    // database ids, so these arrays are the single source of truth for indexing.
    const issuesSlice = Array.isArray(issues) ? issues.slice(0, MAX_AI_ITEMS) : [];
    const prescriptionsSlice = Array.isArray(prescriptions) ? prescriptions.slice(0, MAX_AI_ITEMS) : [];

    const issuesBlock = issuesSlice.length > 0
      ? issuesSlice.map((i: any, idx: number) =>
          `[ISSUE_${idx}] [${i.pillar}] ${i.title || i.description?.substring(0, 100)} (Severidade: ${i.severity}, Tema: ${i.theme || 'N/A'}, Interpretação: ${i.interpretation || 'N/A'})`
        ).join('\n')
      : 'Nenhum problema identificado';

    const prescriptionsBlock = prescriptionsSlice.length > 0
      ? prescriptionsSlice.map((p: any, idx: number) =>
          `[PRESCRIPTION_${idx}] [${p.pillar}] ${p.justification?.substring(0, 200) || p.what || 'N/A'} (Agente: ${p.target_agent || 'N/A'}, Prioridade: ${p.priority || 'N/A'})`
        ).join('\n')
      : 'Nenhuma prescrição';

    // Build indicator catalog for benchmark labels. indicator_scores already
    // joins the indicator row, so harvest it from there. External indicators
    // that aren't in indicator_scores fall back to showing their raw code.
    const indicatorsByCode = new Map<string, any>();
    if (Array.isArray(indicatorScores)) {
      indicatorScores.forEach((is: any) => {
        const indicator = is.indicator || is.indicators;
        const code = indicator?.code;
        if (code && indicator) indicatorsByCode.set(code, indicator);
      });
    }

    // Only attach the context sections when we actually have data — empty
    // headers waste tokens and confuse the model.
    const enterpriseProfileText = formatEnterpriseProfile(enterpriseProfile);
    const enterpriseProfileSection = enterpriseProfileText
      ? `\n## Perfil do Empreendimento\n${enterpriseProfileText}\n`
      : '';
    const externalBenchmarksText = formatExternalBenchmarks(
      Array.isArray(externalValues) ? externalValues : [],
      indicatorsByCode,
    );
    const externalBenchmarksSection = externalBenchmarksText
      ? `\n## Benchmarks Externos (fontes oficiais)\n${externalBenchmarksText}\n`
      : '';

    const userPrompt = `Analise os seguintes dados de diagnóstico para o destino "${destinationName}" e gere uma estrutura de projeto em PORTUGUÊS BRASILEIRO:

## Resumo do Relatório
${reportContent?.substring(0, 3000) || 'Conteúdo do relatório não disponível'}

## Scores dos Eixos SISTUR
${pillarScoresText}

## Indicadores Críticos e de Atenção
${indicatorScoresText}
${enterpriseProfileSection}${externalBenchmarksSection}
## Problemas/Gargalos Identificados (${issues?.length || 0})
Cada gargalo recebe um identificador [ISSUE_<index>]. Use esse índice em "linkedIssueIndex" para conectar cada tarefa ao gargalo que ela resolve.
${issuesBlock}

## Prescrições de Capacitação (${prescriptions?.length || 0})
Cada prescrição recebe um identificador [PRESCRIPTION_<index>]. Use esse índice em "linkedPrescriptionIndex" para conectar cada tarefa à prescrição que ela implementa.
${prescriptionsBlock}

## Planos de Ação Existentes (${actionPlans?.length || 0})
${actionPlansText}

Gere uma estrutura JSON com (TODO O CONTEÚDO EM PORTUGUÊS BRASILEIRO):
1. "description": Uma breve descrição do projeto (2-3 frases), considerando os scores dos eixos e problemas identificados
2. "phases": Array de fases apropriadas para ${methodology}, cada uma com "name", "description" e array "deliverables". As fases devem refletir a priorização sistêmica (RA antes de OE, governança antes de marketing)
3. "tasks": Array de 10-20 tarefas iniciais derivadas dos problemas, prescrições, indicadores críticos e planos de ação. Cada tarefa DEVE ter os seguintes campos:
   - "title": título curto e acionável
   - "description": descrição detalhada
   - "type": um de "epic", "feature", "story" ou "task"
   - "priority": um de "low", "medium", "high" ou "critical"
   - "estimatedHours": número estimado de horas
   - "tags": array de tags (incluir o pilar SISTUR)
   - "linkedIssueIndex": número inteiro (0-based) quando a tarefa resolve DIRETAMENTE um [ISSUE_n] listado acima, ou null
   - "linkedPrescriptionIndex": número inteiro (0-based) quando a tarefa implementa DIRETAMENTE uma [PRESCRIPTION_n] listada acima, ou null
   - REGRA: quase todas as tarefas devem estar ligadas a um ISSUE ou PRESCRIPTION. Apenas tarefas puramente organizacionais (kickoff, governança interna do projeto) podem ter ambos os campos null. Cada ISSUE e cada PRESCRIPTION deve ser coberta por pelo menos uma tarefa.
4. "milestones": Array de 3-5 marcos principais com "name", "description" e "targetDate" sugerida (como string de data ISO, começando a partir de hoje)

Foque em tarefas acionáveis e mensuráveis que abordem os problemas identificados. Conecte cada tarefa a um indicador, gargalo ou prescrição específico.`;

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
        // Fallback: keep indexes aligned with issuesSlice so the client can still
        // populate linked_issue_id when the LLM response fails to parse.
        tasks: issuesSlice.map((issue: any, idx: number) => ({
          title: issue.title || `Tarefa ${idx + 1}`,
          description: issue.description || "",
          type: "task",
          priority: issue.severity === "CRITICO" ? "critical" : issue.severity === "MODERADO" ? "high" : "medium",
          estimatedHours: 8,
          tags: [issue.pillar],
          linkedIssueIndex: idx,
          linkedPrescriptionIndex: null,
        })),
        milestones: [
          { name: "Kickoff", description: "Início do projeto", targetDate: new Date().toISOString().split('T')[0] },
          { name: "Primeira entrega", description: "Conclusão da primeira fase", targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        ],
      };
    }

    console.log("Project structure generated successfully");

    return new Response(
      // Echo back the slice size so the caller can validate its local cap
      // matches — any drift means linkedIssueIndex / linkedPrescriptionIndex
      // would resolve to the wrong row.
      JSON.stringify({ structure, maxAiItems: MAX_AI_ITEMS }),
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
