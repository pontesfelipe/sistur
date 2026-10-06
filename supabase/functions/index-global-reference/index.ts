// Indexa (fatia + vetoriza) um documento de Referências Globais para a busca por trechos.
// Também oferece um modo de teste de busca. Só ADMIN.
// Body: { id } para indexar | { query, k? } para testar a busca.
import { requireAdmin, corsHeaders } from "../_shared/auth.ts";
import { extractPages, chunkPages, embed, searchReferenceChunks } from "../_shared/referenceRag.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BATCH = 32;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const admin = auth.admin;
  const body = await req.json().catch(() => ({}));

  if (typeof body.query === "string") {
    const k = Math.min(Math.max(Number(body.k) || 3, 1), 10);
    const results = await searchReferenceChunks(admin, body.query, k);
    return json({ results });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "id inválido" }, 400);
  const { data: ref } = await admin.from("global_reference_files").select("*").eq("id", id).maybeSingle();
  if (!ref) return json({ error: "Referência não encontrada" }, 404);

  const setStatus = (patch: Record<string, unknown>) =>
    admin.from("global_reference_files").update(patch).eq("id", id);

  await setStatus({ index_status: "indexing", index_error: null });
  try {
    const { data: blob, error: dlErr } = await admin.storage.from("global-references").download(ref.storage_path);
    if (dlErr || !blob) throw new Error("Não foi possível baixar o arquivo");
    let bytes: Uint8Array | null = new Uint8Array(await blob.arrayBuffer());
    const pages = await extractPages(bytes, ref.file_name, ref.file_type || "");
    bytes = null;
    const chunks = chunkPages(pages);
    if (chunks.length === 0) throw new Error("Não consegui ler texto do documento (PDF escaneado?).");

    await admin.from("global_reference_chunks").delete().eq("reference_id", id);
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const vecs = await embed(slice.map((c) => c.content));
      const rows = slice.map((c, j) => ({
        reference_id: id, page: c.page, chunk_index: i + j, content: c.content, embedding: JSON.stringify(vecs[j]),
      }));
      const { error } = await admin.from("global_reference_chunks").insert(rows);
      if (error) throw new Error(error.message);
    }
    await setStatus({ index_status: "ready", chunk_count: chunks.length, indexed_at: new Date().toISOString(), index_error: null });
    return json({ ok: true, chunks: chunks.length, pages: pages.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    console.error("index-global-reference", msg);
    await setStatus({ index_status: "error", index_error: msg });
    return json({ error: msg }, 500);
  }
});
