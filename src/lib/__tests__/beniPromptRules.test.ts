import { describe, it, expect } from "vitest";
import { buildFixedRules, needsFullContext, dateRule } from "../../../supabase/functions/beni-chat/promptRules";

describe("Professor Beni — regras permanentes", () => {
  it("sempre inclui desambiguação, formato de voz, porcentagem e limites", () => {
    const r = buildFixedRules(new Date("2026-10-06T15:00:00Z"));
    expect(r).toContain("REGRA DE DESAMBIGUAÇÃO");
    expect(r).toContain("FORMATO DE VOZ");
    expect(r).toContain("67 por cento");
    expect(r).toContain("LIMITES DE RESPONSABILIDADE");
  });
  it("injeta a data de hoje no horário de Brasília", () => {
    expect(dateRule(new Date("2026-10-06T15:00:00Z"))).toContain("6 de outubro de 2026");
  });
  it("saudação usa contexto enxuto; pergunta sobre diagnóstico usa completo", () => {
    expect(needsFullContext("Oi, tudo bem?")).toBe(false);
    expect(needsFullContext("Analise meu diagnóstico de Gostoso")).toBe(true);
    expect(needsFullContext("Oi", true)).toBe(true);
  });
});
