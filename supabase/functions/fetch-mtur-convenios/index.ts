import { corsHeaders, requireUser } from "../_shared/auth.ts";

// Portal da Transparência (CGU) — convênios federais do Ministério do Turismo (órgão 54000) por município.
const API = "https://api.portaldatransparencia.gov.br/api-de-dados/convenios";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const toDate = (s?: string) => {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s.slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const projectId = typeof body.project_id === "string" ? body.project_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return json({ error: "project_id inválido" }, 400);

  // Lido com o cliente do usuário: RLS garante que ele tem acesso ao projeto.
  const { data: project } = await auth.client.from("projects").select("id, destination:destinations(ibge_code, name)").eq("id", projectId).maybeSingle();
  const ibge = (project as any)?.destination?.ibge_code;
  if (!project) return json({ error: "Projeto não encontrado" }, 404);
  if (!ibge) return json({ error: "O destino do projeto não tem código IBGE." }, 400);

  const key = Deno.env.get("PORTAL_TRANSPARENCIA_API_KEY");
  if (!key) return json({ needs_key: true, convenios: [] });

  const convenios: any[] = [];
  for (let pagina = 1; pagina <= 5; pagina++) {
    const r = await fetch(`${API}?codigoIBGE=${ibge}&codigoOrgao=54000&pagina=${pagina}`, {
      headers: { "chave-api-dados": key, Accept: "application/json" }, signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error(`Portal da Transparência [${r.status}]: ${t}`);
      return json({ error: "Portal da Transparência recusou a consulta", status: r.status, details: t.slice(0, 500) }, 502);
    }
    const items = await r.json();
    if (!Array.isArray(items) || items.length === 0) break;
    for (const c of items) {
      convenios.push({
        numero: String(c.dimConvenio?.numero ?? c.numero ?? c.id),
        objeto: String(c.dimConvenio?.objeto ?? c.objeto ?? ""),
        situacao: String(c.situacao ?? ""),
        valor: Number(c.valor ?? 0),
        valor_liberado: Number(c.valorLiberado ?? 0),
        contrapartida: Number(c.valorContrapartida ?? 0),
        fim_vigencia: toDate(c.dataFinalVigencia),
        orgao: String(c.orgao?.nome ?? "Ministério do Turismo"),
      });
    }
    if (items.length < 15) break;
  }
  return json({ convenios, municipio: (project as any).destination?.name });
});
