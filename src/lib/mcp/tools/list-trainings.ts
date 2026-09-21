import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_trainings",
  title: "Listar capacitações",
  description: "Lista as capacitações e cursos do catálogo educacional disponíveis ao usuário.",
  inputSchema: {
    pillar: z.enum(["RA", "OE", "AO"]).optional().describe("Filtra pelo pilar SISTUR."),
    search: z.string().trim().min(1).optional().describe("Filtra por título."),
    limit: z.number().int().min(1).max(100).default(25).describe("Máximo de capacitações retornadas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ pillar, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("edu_trainings")
      .select("id, title, description, pillar, level, duration_minutes, is_foundation, status")
      .order("title", { ascending: true })
      .limit(limit);
    if (pillar) query = query.eq("pillar", pillar as never);
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const trainings = (data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      pillar: t.pillar,
      level: t.level,
      durationMinutes: t.duration_minutes,
      isFoundation: t.is_foundation,
      status: t.status,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(trainings, null, 2) }],
      structuredContent: { trainings },
    };
  },
});
