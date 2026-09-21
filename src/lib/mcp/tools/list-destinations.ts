import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_destinations",
  title: "Listar destinos",
  description: "Lista os destinos turísticos acessíveis ao usuário autenticado.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Filtra por nome do destino."),
    limit: z.number().int().min(1).max(100).default(25).describe("Máximo de destinos retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("destinations")
      .select("id, name, uf, tourism_region, municipality_type, has_pdt, created_at")
      .order("name", { ascending: true })
      .limit(limit);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const destinations = (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      uf: d.uf,
      tourismRegion: d.tourism_region,
      municipalityType: d.municipality_type,
      hasPdt: d.has_pdt,
      createdAt: d.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(destinations, null, 2) }],
      structuredContent: { destinations },
    };
  },
});
