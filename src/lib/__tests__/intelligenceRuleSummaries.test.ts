import { describe, it, expect } from "vitest";
import { BENI_RULE_SUMMARIES, buildFixedRules } from "../../../supabase/functions/beni-chat/promptRules";
import { SUPPORT_RULE_SUMMARIES, PERMANENT_RULES } from "../../../supabase/functions/support-chat/rules";

describe("Inteligência mostra todas as regras fixas", () => {
  it("Beni: um resumo para cada regra permanente", () => {
    const blocks = buildFixedRules().split("\n\n").length;
    expect(BENI_RULE_SUMMARIES.length).toBeGreaterThanOrEqual(blocks);
  });
  it("Guia: um resumo para cada regra permanente", () => {
    const rules = PERMANENT_RULES.split("Visão geral")[0].split("\n").filter((l) => l.startsWith("- ")).length;
    expect(SUPPORT_RULE_SUMMARIES.length).toBeGreaterThanOrEqual(rules);
  });
});
