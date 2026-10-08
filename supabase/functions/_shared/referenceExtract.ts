// Extração de texto das Referências Globais (Deno apenas).
// Imports com texto literal: o empacotador das funções só inclui pacotes npm
// que aparecem literalmente no código (import por variável quebra no deploy).
import type { PageText } from "./referenceRag.ts";

/** Lê o documento em partes (PDF página a página) para não estourar memória. */
export async function extractPages(bytes: Uint8Array, fileName: string, mime: string, maxChars = 2_000_000): Promise<PageText[]> {
  const lower = fileName.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const { getDocumentProxy } = await import("npm:unpdf@1.8.1");
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
    const mammoth: any = await import("npm:mammoth@1.8.0");
    text = (await (mammoth.default ?? mammoth).extractRawText({ buffer: bytes })).value;
  } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const XLSX: any = await import("npm:xlsx@0.18.5");
    const wb = XLSX.read(bytes, { type: "array" });
    text = wb.SheetNames.slice(0, 10).map((n: string) => `Planilha ${n}:\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n])).join("\n\n");
  } else {
    text = new TextDecoder().decode(bytes);
  }
  return [{ page: null, text: text.slice(0, maxChars) }];
}
