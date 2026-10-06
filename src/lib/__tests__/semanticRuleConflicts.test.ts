import { describe, it, expect } from "vitest";
import { findRuleConflicts, findOfficialScaleDivergences } from "../semanticRuleConflicts";

const existing = [{ id: "1", key: "classification.scale", title: "Régua", category: "classification", applies_to: "both", active: true }];

describe("semantic rule conflicts", () => {
  it("bloqueia chave duplicada", () => {
    const r = findRuleConflicts({ key: "classification.scale", title: "X", content: "" }, existing, null);
    expect(r.some((i) => i.blocking)).toBe(true);
  });
  it("não acusa a própria regra ao editar", () => {
    expect(findRuleConflicts({ key: "classification.scale", title: "Régua", content: "" }, existing, "1")).toHaveLength(0);
  });
  it("aceita a régua oficial", () => {
    expect(findOfficialScaleDivergences("Crítico: 0–33%\nAtenção: 34–66%\nAdequado: 67–79%\nForte: 80–89%\nExcelente: 90–100%")).toHaveLength(0);
  });
  it("aponta faixa antiga de Excelente 95", () => {
    expect(findOfficialScaleDivergences("Excelente: 95–100%")).toHaveLength(1);
  });
});
