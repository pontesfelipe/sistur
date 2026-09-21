import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "Listar projetos",
  description: "Lista os projetos de intervenção acessíveis ao usuário autenticado.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filtra pelo status do projeto."),
    destination_id: z.string().uuid().optional().describe("Filtra por destino."),
    limit: z.number().int().min(1).max(100).default(25).describe("Máximo de projetos retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, destination_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("projects")
      .select(
        "id, name, description, status, priority, methodology, planned_start_date, planned_end_date, budget_estimated, budget_actual, destination_id, assessment_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    if (destination_id) query = query.eq("destination_id", destination_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const projects = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      priority: p.priority,
      methodology: p.methodology,
      plannedStartDate: p.planned_start_date,
      plannedEndDate: p.planned_end_date,
      budgetEstimated: p.budget_estimated,
      budgetActual: p.budget_actual,
      destinationId: p.destination_id,
      assessmentId: p.assessment_id,
      createdAt: p.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
      structuredContent: { projects },
    };
  },
});
