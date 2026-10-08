// Busca por trechos (RAG) nas Referências Globais: extração página a página,
// fatiamento, embeddings e busca híbrida (semântica + palavras-chave).
const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
// Import dinâmico por variável: mantém o módulo testável fora do Deno.
const load = (spec: string) => import(spec);
const EMB_MODEL = "openai/text-embedding-3-small"; // 1536 dimensões

export interface PageText { page: number | null; text: string }

/** Lê o documento em partes (PDF página a página) para não estourar memória. */
export async function extractPages(bytes: Uint8Array, fileName: string, mime: string, maxChars = 2_000_000): Promise<PageText[]> {
  const lower = fileName.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const { getDocumentProxy } = await load("npm:unpdf@1.8.1");
    const pdf = await getDocumentProxy(bytes, { disableFontFace: true, isEvalSupported: false } as any);
    const out: PageText[] = [];
    let total = 0;
    try {
      for (let i = 1; i <= pdf.numPages && total < maxChars; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const t = content.items.map((it: any) => it.str ?? "").join(" ").replace(/\s+/g, " ").trim();
        if (t) out.push({ page: i, text: t });
        total += t.length;
        page.cleanup();
      }
    } finally {
      await pdf.destroy().catch(() => {});
    }
    return out;
  }
  let text = "";
  if (lower.endsWith(".docx")) {
    const mammoth = await load("npm:mammoth@1.8.0");
    text = (await (mammoth.default ?? mammoth).extractRawText({ buffer: bytes })).value;
  } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const XLSX = await load("npm:xlsx@0.18.5");
    const wb = XLSX.read(bytes, { type: "array" });
    text = wb.SheetNames.slice(0, 10).map((n: string) => `Planilha ${n}:\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n])).join("\n\n");
  } else {
    text = new TextDecoder().decode(bytes);
  }
  return [{ page: null, text: text.slice(0, maxChars) }];
}

/** Corta em trechos de ~size caracteres com sobreposição, respeitando fim de frase. */
export function chunkPages(pages: PageText[], size = 1000, overlap = 150): { page: number | null; content: string }[] {
  const chunks: { page: number | null; content: string }[] = [];
  for (const p of pages) {
    const t = p.text.replace(/\s+/g, " ").trim();
    let start = 0;
    while (start < t.length) {
      let end = Math.min(start + size, t.length);
      if (end < t.length) {
        const dot = t.lastIndexOf(". ", end);
        if (dot > start + size * 0.6) end = dot + 1;
      }
      const c = t.slice(start, end).trim();
      if (c.length >= 80) chunks.push({ page: p.page, content: c });
      if (end >= t.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }
  return chunks;
}

export async function embed(inputs: string[]): Promise<number[][]> {
  const key = (globalThis as any).Deno?.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMB_MODEL, input: inputs }),
  });
  if (res.status === 402) throw new Error("Créditos de IA insuficientes.");
  if (res.status === 429) throw new Error("Limite de requisições de IA excedido.");
  if (!res.ok) throw new Error(`Falha ao gerar vetores (${res.status})`);
  const j = await res.json();
  return j.data.map((d: any) => d.embedding);
}

export interface RefChunk { id: string; reference_id: string; file_name: string; page: number | null; content: string; similarity: number; score: number }

/** Busca os k trechos mais relevantes. Nunca lança: em falha devolve []. */
/** Similaridade mínima para um trecho contar como relevante (abaixo disso, fallback sem citação). */
export const RELEVANCE_THRESHOLD = 0.45;

export async function searchReferenceChunks(admin: any, query: string, k = 3, minSimilarity = RELEVANCE_THRESHOLD): Promise<RefChunk[]> {
  try {
    const q = (query || "").trim().slice(0, 2000);
    if (q.length < 8) return [];
    const [vec] = await embed([q]);
    const { data, error } = await admin.rpc("match_reference_chunks", {
      query_embedding: JSON.stringify(vec), query_text: q, match_count: k, min_similarity: minSimilarity,
    });
    if (error) { console.error("match_reference_chunks", error); return []; }
    return data ?? [];
  } catch (e) {
    console.error("searchReferenceChunks", e);
    return [];
  }
}

/** Formata trechos para o prompt (texto simples, sem markdown). */
export function formatChunksForPrompt(chunks: RefChunk[]): string {
  return chunks.map((c, i) =>
    `[T${i + 1}] ${c.file_name}${c.page ? `, página ${c.page}` : ""}:\n"${c.content}"`
  ).join("\n\n");
}

/** Lista "Documento — páginas X, Y" agrupada por documento. */
export function formatSourcesList(chunks: RefChunk[]): string[] {
  const byDoc = new Map<string, Set<number>>();
  for (const c of chunks) {
    if (!byDoc.has(c.file_name)) byDoc.set(c.file_name, new Set());
    if (c.page) byDoc.get(c.file_name)!.add(c.page);
  }
  return [...byDoc.entries()].map(([doc, pages]) => {
    const p = [...pages].sort((a, b) => a - b);
    return p.length ? `${doc} — ${p.length > 1 ? "páginas" : "página"} ${p.join(", ")}` : doc;
  });
}

/** Instrução de fallback quando nenhum trecho é relevante para a pergunta. */
export const NO_MATCH_INSTRUCTION =
  "BUSCA NOS DOCUMENTOS DE REFERÊNCIA: nenhum trecho dos documentos é suficientemente relacionado a esta pergunta. Não cite documentos, páginas ou trechos. Se a pergunta for sobre o conteúdo de algum documento, diga com naturalidade que os documentos de referência cadastrados não tratam diretamente desse tema e responda com base no seu conhecimento geral, deixando claro que não é uma citação.";
