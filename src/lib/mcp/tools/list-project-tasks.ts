import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_project_tasks",
  title: "Listar tarefas do projeto",
  description: "Lista as tarefas de um projeto, com responsável, prazo e status.",
  inputSchema: {
    project_id: z.string().uuid().describe("Identificador do projeto."),
    status: z.string().trim().min(1).optional().describe("Filtra pelo status da tarefa."),
    limit: z.number().int().min(1).max(200).default(50).describe("Máximo de tarefas retornadas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("project_tasks")
      .select(
        "id, title, description, status, priority, task_type, assignee_name, planned_start_date, planned_end_date, story_points, created_at"
      )
      .eq("project_id", project_id)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const tasks = (data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      taskType: t.task_type,
      assigneeName: t.assignee_name,
      plannedStartDate: t.planned_start_date,
      plannedEndDate: t.planned_end_date,
      storyPoints: t.story_points,
      createdAt: t.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
      structuredContent: { tasks },
    };
  },
});
