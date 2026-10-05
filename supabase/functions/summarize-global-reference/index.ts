// Gera (ou melhora) o resumo executivo de um documento de Referências Globais.
// Lê o documento inteiro (PDF/DOCX/XLSX/CSV/TXT) e devolve um resumo estruturado
// para o admin revisar antes de salvar. Só ADMIN.
import { requireAdmin, corsHeaders } from "../_shared/auth.ts";

const MAX_DOC_CHARS = 600_000; // ~150k tokens — cabe no contexto do modelo

async function extractText(bytes: Uint8Array, fileName: string, mime: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("npm:unpdf@0.12.1");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text);
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("npm:mammoth@1.8.0");
    const res = await (mammoth.default ?? mammoth).extractRawText({ buffer: bytes });
    return res.value;
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const XLSX = await import("npm:xlsx@0.18.5");
    const wb = XLSX.read(bytes, { type: "array" });
    return wb.SheetNames.slice(0, 10)
      .map((n: string) => `Planilha ${n}:\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n]))
      .join("\n\n");
  }
  return new TextDecoder().decode(bytes);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    let bytes: Uint8Array;
    let fileName = "documento";
    let mime = "";
    let category = "";
    let description = "";
    let existing = "";

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file") as File | null;
      if (!file) return json({ error: "Nenhum arquivo enviado." }, 400);
      if (file.size > 20 * 1024 * 1024) return json({ error: "Arquivo maior que 20 MB." }, 400);
      bytes = new Uint8Array(await file.arrayBuffer());
      fileName = file.name;
      mime = file.type;
      category = String(fd.get("category") || "");
      description = String(fd.get("description") || "");
    } else {
      const body = await req.json().catch(() => ({}));
      const id = typeof body.id === "string" ? body.id : "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "id inválido" }, 400);
      const { data: ref, error } = await auth.admin.from("global_reference_files").select("*").eq("id", id).maybeSingle();
      if (error || !ref) return json({ error: "Referência não encontrada" }, 404);
      const { data: blob, error: dlErr } = await auth.admin.storage.from("global-references").download(ref.storage_path);
      if (dlErr || !blob) return json({ error: "Não foi possível baixar o arquivo" }, 404);
      bytes = new Uint8Array(await blob.arrayBuffer());
      fileName = ref.file_name;
      mime = ref.file_type || "";
      category = ref.category || "";
      description = ref.description || "";
      existing = body.improve ? (ref.summary || "") : "";
    }

    let text = "";
    try { text = (await extractText(bytes, fileName, mime)).replace(/\s+\n/g, "\n").trim(); }
    catch (e) { console.error("extract failed", e); }
    if (text.length < 200) {
      return json({ error: "Não consegui ler o texto do documento (pode ser um PDF escaneado). Escreva o resumo manualmente." }, 422);
    }
    const truncated = text.length > MAX_DOC_CHARS;
    text = text.slice(0, MAX_DOC_CHARS);

    const system = `Você prepara resumos executivos de documentos de referência para o SISTUR, plataforma de gestão de destinos turísticos baseada na teoria sistêmica de Mario Beni (pilares RA – Relações Ambientais, OE – Organização Estrutural, AO – Ações Operacionais).
O resumo será injetado no contexto do Professor Beni (assistente de IA) e na geração de relatórios técnicos de diagnóstico. Ele substitui o documento inteiro, então precisa ser fiel, denso e útil para fundamentar recomendações a municípios.
Regras:
- Escreva em português do Brasil, texto simples, sem markdown (sem #, **, tabelas). Use títulos em MAIÚSCULAS seguidos de dois pontos e itens com hífen.
- Entre 3.000 e 6.000 caracteres.
- Estrutura: IDENTIFICAÇÃO (título, autor/órgão, ano, tipo); TESE OU OBJETIVO CENTRAL; PRINCIPAIS CONCEITOS E DIRETRIZES; METAS, NÚMEROS E PRAZOS (só os que constam no texto); RELAÇÃO COM OS PILARES RA, OE E AO; IMPLICAÇÕES PARA A GESTÃO MUNICIPAL (o que um gestor deve fazer); LIMITES DO DOCUMENTO.
- Nunca invente dados, números ou citações que não estejam no documento. Se algo não constar, não mencione.`;

    const user = `Arquivo: ${fileName}
Categoria: ${category || "(não informada)"}
Descrição: ${description || "(nenhuma)"}
${existing ? `\nRESUMO ATUAL (melhore-o: preserve o que estiver correto, corrija imprecisões, acrescente o que faltar segundo o documento):\n"""\n${existing}\n"""\n` : ""}
TEXTO DO DOCUMENTO${truncated ? " (truncado por tamanho)" : ""}:
"""
${text}
"""`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: system,
        input: [{ role: "user", content: [{ type: "input_text", text: user }] }],
        stream: true,
        store: false,
        reasoning: { effort: "low" },
      }),
    });
    if (res.status === 429) return json({ error: "Limite de requisições de IA excedido. Tente em alguns minutos." }, 429);
    if (res.status === 402) return json({ error: "Créditos de IA insuficientes." }, 402);
    if (!res.ok || !res.body) {
      console.error("AI error", res.status, await res.text().catch(() => ""));
      return json({ error: "Falha ao gerar o resumo com IA." }, 502);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "response.output_text.delta") out += ev.delta;
        } catch { /* ignore */ }
      }
    }
    const summary = out.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
    if (!summary) return json({ error: "A IA não retornou resumo." }, 502);
    return json({ summary, chars_read: text.length, truncated });
  } catch (e) {
    console.error("summarize error", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
