import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_assessment",
  title: "Detalhar diagnóstico",
  description:
    "Retorna um diagnóstico com notas por pilar (RA, OE, AO), bloqueios sistêmicos e interpretação IGMA.",
  inputSchema: { assessment_id: z.string().uuid().describe("Identificador do diagnóstico.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ assessment_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("assessments")
      .select(
        "id, title, status, diagnostic_type, tier, final_score, final_classification, governance_block, ra_limitation, marketing_blocked, externality_warning, igma_interpretation, calculated_at, needs_recalculation, destination_id, destinations(name, uf)"
      )
      .eq("id", assessment_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) throw new ToolError("Diagnóstico não encontrado ou sem acesso.");

    const { data: pillars, error: pillarError } = await supabase
      .from("assessment_pillar_scores")
      .select("pillar, score, classification")
      .eq("assessment_id", assessment_id);
    if (pillarError) {
      return { content: [{ type: "text", text: pillarError.message }], isError: true };
    }

    const dest = data.destinations as { name?: string; uf?: string } | null;
    const assessment = {
      id: data.id,
      title: data.title,
      status: data.status,
      diagnosticType: data.diagnostic_type,
      tier: data.tier,
      finalScorePercent: data.final_score,
      finalClassification: data.final_classification,
      governanceBlock: data.governance_block,
      raLimitation: data.ra_limitation,
      marketingBlocked: data.marketing_blocked,
      externalityWarning: data.externality_warning,
      needsRecalculation: data.needs_recalculation,
      calculatedAt: data.calculated_at,
      destinationId: data.destination_id,
      destinationName: dest?.name ?? null,
      destinationUf: dest?.uf ?? null,
      igmaInterpretation: data.igma_interpretation ?? null,
      pillars: (pillars ?? []).map((p) => ({
        pillar: p.pillar,
        scorePercent: p.score,
        classification: p.classification,
      })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(assessment, null, 2) }],
      structuredContent: { assessment },
    };
  },
});
