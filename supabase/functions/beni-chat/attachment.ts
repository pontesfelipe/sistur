// Extração de conteúdo e triagem de relevância de anexos do Professor Beni.
const MAX_TEXT = 60000;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export type AttachmentPayload = {
  fileName: string;
  mime: string;
  text?: string; // texto extraído
  imageDataUrl?: string; // imagem
};

export async function extractAttachment(bytes: Uint8Array, fileName: string, mime: string): Promise<AttachmentPayload> {
  const lower = fileName.toLowerCase();
  try {
    if (mime.startsWith("image/")) {
      return { fileName, mime, imageDataUrl: `data:${mime};base64,${toBase64(bytes)}` };
    }
    if (mime === "application/pdf" || lower.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("npm:unpdf@0.12.1");
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      return { fileName, mime, text: String(text).slice(0, MAX_TEXT) };
    }
    if (lower.endsWith(".docx")) {
      const mammoth = await import("npm:mammoth@1.8.0");
      const res = await (mammoth.default ?? mammoth).extractRawText({ buffer: bytes });
      return { fileName, mime, text: res.value.slice(0, MAX_TEXT) };
    }
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const XLSX = await import("npm:xlsx@0.18.5");
      const wb = XLSX.read(bytes, { type: "array" });
      const parts: string[] = [];
      for (const name of wb.SheetNames.slice(0, 5)) {
        parts.push(`Planilha ${name}:\n` + XLSX.utils.sheet_to_csv(wb.Sheets[name]));
      }
      return { fileName, mime, text: parts.join("\n\n").slice(0, MAX_TEXT) };
    }
    // txt, csv, md e demais textos
    return { fileName, mime, text: new TextDecoder().decode(bytes).slice(0, MAX_TEXT) };
  } catch (e) {
    console.error("beni attachment extract failed", e);
    return { fileName, mime, text: "" };
  }
}

export function attachmentContentParts(a: AttachmentPayload, question: string) {
  const header = `O usuário anexou o arquivo "${a.fileName}".`;
  if (a.imageDataUrl) {
    return [
      { type: "text", text: `${header}\n\nPergunta: ${question}` },
      { type: "image_url", image_url: { url: a.imageDataUrl } },
    ];
  }
  return [{
    type: "text",
    text: `${header} Conteúdo extraído:\n"""\n${(a.text || "(não foi possível ler o conteúdo)").slice(0, MAX_TEXT)}\n"""\n\nPergunta: ${question}`,
  }];
}

export async function triageRelevance(apiKey: string, a: AttachmentPayload, question: string): Promise<{ relevant: boolean; reason: string }> {
  const instructions = `Você faz a triagem de documentos enviados ao Professor Beni, assistente de turismo do SISTUR.
Considere RELEVANTE se o documento trata de turismo, destinos, hospitalidade, hotelaria, eventos, patrimônio natural ou cultural, meio ambiente, sustentabilidade, gestão pública, planejamento territorial ou urbano, políticas públicas, legislação, orçamento ou dados socioeconômicos de municípios, infraestrutura, governança, qualificação profissional, marketing de destinos, diagnósticos ou relatórios do SISTUR.
Considere IRRELEVANTE se for claramente de outro tema (receitas, documentos pessoais, memes, código de programação, saúde médica, entretenimento, religião, política partidária) ou se estiver vazio/ilegível.
Em caso de dúvida razoável, considere relevante.`;
  const content = a.imageDataUrl
    ? [
      { type: "input_text", text: `Arquivo: ${a.fileName}. Pergunta do usuário: ${question}` },
      { type: "input_image", image_url: a.imageDataUrl },
    ]
    : [{ type: "input_text", text: `Arquivo: ${a.fileName}\nPergunta do usuário: ${question}\nAmostra do conteúdo:\n${(a.text || "").slice(0, 8000) || "(vazio)"}` }];

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions,
        input: [{ role: "user", content }],
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: {
          format: {
            type: "json_schema",
            name: "triage",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: { relevant: { type: "boolean" }, reason: { type: "string" } },
              required: ["relevant", "reason"],
            },
          },
        },
      }),
    });
    if (!res.ok || !res.body) {
      console.error("triage error", res.status, await res.text().catch(() => ""));
      return { relevant: true, reason: "triagem indisponível" };
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
    const parsed = JSON.parse(out);
    return { relevant: !!parsed.relevant, reason: String(parsed.reason || "") };
  } catch (e) {
    console.error("triage failed", e);
    return { relevant: true, reason: "triagem indisponível" };
  }
}

export function sseTextResponse(text: string, headers: Record<string, string>) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      c.enqueue(enc.encode("data: [DONE]\n\n"));
      c.close();
    },
  });
  return new Response(body, { headers: { ...headers, "Content-Type": "text/event-stream" } });
}

export const IRRELEVANT_REPLY = (fileName: string) =>
  `Agradeço muito o envio do arquivo ${fileName}, mas pelo que pude observar ele não trata de turismo, de gestão de destinos ou da metodologia SISTUR, então não me sinto à vontade para avaliá-lo. Se você tiver um material sobre o seu destino, como um plano de turismo, um inventário, um relatório de diagnóstico ou dados do município, terei muito prazer em analisá-lo com você.`;
