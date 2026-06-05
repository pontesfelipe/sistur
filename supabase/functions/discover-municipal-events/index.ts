// discover-municipal-events
// Busca candidatos a eventos turísticos do município via Firecrawl Search + JSON extraction.
// NÃO insere nada — apenas retorna sugestões para aprovação humana na UI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, requireUser } from "../_shared/auth.ts";

interface EventCandidate {
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  description?: string;
  category?: string;
  source_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireUser(req);
  if (guard instanceof Response) return guard;
  const { user } = guard;

  const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_KEY) {
    return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY não configurada" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { org_id?: string; year?: number } = {};
  try { body = await req.json(); } catch { /* noop */ }

  const year = body.year ?? new Date().getFullYear();
  if (!body.org_id) {
    return new Response(JSON.stringify({ error: "org_id obrigatório" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Verifica que o user pertence à org OU é ADMIN (RLS-friendly check)
  const { data: membership } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();
  const { data: rolesData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (rolesData ?? []).some((r: any) => r.role === "ADMIN" || r.role === "ORG_ADMIN");
  if (!isAdmin && membership?.org_id !== body.org_id) {
    return new Response(JSON.stringify({ error: "Sem permissão para esta organização" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve destino
  const { data: dest } = await admin
    .from("destinations")
    .select("name, uf")
    .eq("org_id", body.org_id)
    .maybeSingle();
  if (!dest?.name) {
    return new Response(JSON.stringify({ error: "Destino não encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const locationLabel = `${dest.name}${dest.uf ? ` ${dest.uf}` : ""}`;
  const query = `agenda de eventos turismo ${locationLabel} ${year} site:gov.br OR "secretaria de turismo"`;

  // 1) Search via Firecrawl
  const searchRes = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 5 }),
  });
  const searchData = await searchRes.json();
  if (!searchRes.ok) {
    return new Response(JSON.stringify({ error: "Firecrawl search falhou", detail: searchData }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // shape: data?.web?.[{url,title,description}] OU data: [...]
  const results: Array<{ url: string; title?: string; description?: string }> =
    (searchData?.data?.web ?? searchData?.web ?? searchData?.data ?? []).slice(0, 4);

  if (results.length === 0) {
    return new Response(JSON.stringify({ candidates: [], note: "Nenhum resultado encontrado", query }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2) Para cada URL, faz scrape com extração JSON estruturada
  const eventSchema = {
    type: "object",
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            start_date: { type: "string", description: `Data de início no formato YYYY-MM-DD. Ano alvo: ${year}.` },
            end_date: { type: "string", description: "Data de fim no formato YYYY-MM-DD." },
            description: { type: "string" },
            category: { type: "string", description: "cultural, esportivo, gastronomico, religioso ou corporativo" },
          },
          required: ["name", "start_date", "end_date"],
        },
      },
    },
  };

  const candidates: EventCandidate[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  for (const r of results) {
    if (!r?.url) continue;
    try {
      const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: r.url,
          onlyMainContent: true,
          formats: [{
            type: "json",
            schema: eventSchema,
            prompt: `Extraia eventos turísticos de ${locationLabel} programados para ${year}. Inclua apenas eventos com datas claras. Datas no formato YYYY-MM-DD.`,
          }],
        }),
      });
      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) { errors.push({ url: r.url, error: scrapeData?.error || `HTTP ${scrapeRes.status}` }); continue; }
      const json = scrapeData?.data?.json ?? scrapeData?.json;
      const list: any[] = Array.isArray(json?.events) ? json.events : [];
      for (const ev of list) {
        if (!ev?.name || !ev?.start_date || !ev?.end_date) continue;
        // Filtra somente datas do ano solicitado
        if (!String(ev.start_date).startsWith(String(year))) continue;
        candidates.push({
          name: String(ev.name).slice(0, 200),
          start_date: String(ev.start_date),
          end_date: String(ev.end_date),
          description: ev.description ? String(ev.description).slice(0, 500) : undefined,
          category: ev.category ? String(ev.category).toLowerCase() : undefined,
          source_url: r.url,
        });
      }
    } catch (e: any) {
      errors.push({ url: r.url, error: e?.message ?? String(e) });
    }
  }

  // Deduplica por (name + start_date)
  const seen = new Set<string>();
  const deduped = candidates.filter((c) => {
    const k = `${c.name.toLowerCase()}|${c.start_date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return new Response(JSON.stringify({
    candidates: deduped,
    query,
    sources_consulted: results.map((r) => r.url),
    errors,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});