import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_assessments",
  title: "Listar diagnósticos",
  description: "Lista os diagnósticos (rodadas de avaliação) acessíveis ao usuário, com nota e classificação final.",
  inputSchema: {
    destination_id: z.string().uuid().optional().describe("Filtra por destino."),
    status: z.string().trim().min(1).optional().describe("Filtra pelo status do diagnóstico."),
    limit: z.number().int().min(1).max(100).default(20).describe("Máximo de diagnósticos retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ destination_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("assessments")
      .select(
        "id, title, status, diagnostic_type, tier, final_score, final_classification, calculated_at, created_at, destination_id, destinations(name, uf)"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (destination_id) query = query.eq("destination_id", destination_id);
    if (status) query = query.eq("status", status as never);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const assessments = (data ?? []).map((a) => {
      const dest = a.destinations as { name?: string; uf?: string } | null;
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        diagnosticType: a.diagnostic_type,
        tier: a.tier,
        finalScorePercent: a.final_score,
        finalClassification: a.final_classification,
        calculatedAt: a.calculated_at,
        createdAt: a.created_at,
        destinationId: a.destination_id,
        destinationName: dest?.name ?? null,
        destinationUf: dest?.uf ?? null,
      };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(assessments, null, 2) }],
      structuredContent: { assessments },
    };
  },
});
