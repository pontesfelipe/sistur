import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_project_task",
  title: "Criar tarefa de projeto",
  description: "Cria uma tarefa em um projeto existente, no nome do usuário autenticado.",
  inputSchema: {
    project_id: z.string().uuid().describe("Identificador do projeto."),
    title: z.string().trim().min(1).max(200).describe("Título da tarefa."),
    description: z.string().trim().max(2000).optional().describe("Descrição da tarefa."),
    priority: z.enum(["baixa", "media", "alta", "critica"]).optional().describe("Prioridade da tarefa."),
    planned_end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Prazo planejado no formato AAAA-MM-DD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ project_id, title, description, priority, planned_end_date }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("project_tasks")
      .insert({
        project_id,
        title,
        description: description ?? null,
        priority: priority ?? "media",
        planned_end_date: planned_end_date ?? null,
        status: "pendente",
      })
      .select("id, title, status, priority, planned_end_date")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const task = data
      ? {
          id: data.id,
          title: data.title,
          status: data.status,
          priority: data.priority,
          plannedEndDate: data.planned_end_date,
        }
      : null;
    return {
      content: [{ type: "text", text: `Tarefa criada: ${task?.title ?? title}` }],
      structuredContent: { task },
    };
  },
});
