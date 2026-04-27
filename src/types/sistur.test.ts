import { describe, it, expect } from "vitest";
import { getSeverityFromScore, getLegacySeverityFromScore, SEVERITY_INFO } from "./sistur";

describe("getSeverityFromScore — régua oficial 5 níveis (Fase 5)", () => {
  it("retorna CRITICO para scores < 0.34", () => {
    expect(getSeverityFromScore(0)).toBe("CRITICO");
    expect(getSeverityFromScore(0.33)).toBe("CRITICO");
    expect(getSeverityFromScore(0.339)).toBe("CRITICO");
  });

  it("retorna MODERADO para 0.34–0.66", () => {
    expect(getSeverityFromScore(0.34)).toBe("MODERADO");
    expect(getSeverityFromScore(0.5)).toBe("MODERADO");
    expect(getSeverityFromScore(0.669)).toBe("MODERADO");
  });

  it("retorna BOM (Adequado) para 0.67–0.79", () => {
    expect(getSeverityFromScore(0.67)).toBe("BOM");
    expect(getSeverityFromScore(0.75)).toBe("BOM");
    expect(getSeverityFromScore(0.799)).toBe("BOM");
  });

  it("retorna FORTE para 0.80–0.89", () => {
    expect(getSeverityFromScore(0.8)).toBe("FORTE");
    expect(getSeverityFromScore(0.85)).toBe("FORTE");
    expect(getSeverityFromScore(0.899)).toBe("FORTE");
  });

  it("retorna EXCELENTE para >= 0.90", () => {
    expect(getSeverityFromScore(0.9)).toBe("EXCELENTE");
    expect(getSeverityFromScore(1)).toBe("EXCELENTE");
  });

  it("aceita score em escala 0–100 (legado)", () => {
    expect(getSeverityFromScore(33)).toBe("CRITICO");
    expect(getSeverityFromScore(67)).toBe("BOM");
    expect(getSeverityFromScore(95)).toBe("EXCELENTE");
  });
});

describe("getLegacySeverityFromScore — colapso para 3 níveis", () => {
  it("colapsa FORTE/EXCELENTE em BOM", () => {
    expect(getLegacySeverityFromScore(0.95)).toBe("BOM");
    expect(getLegacySeverityFromScore(0.85)).toBe("BOM");
    expect(getLegacySeverityFromScore(0.7)).toBe("BOM");
  });

  it("preserva limites de MODERADO e CRITICO", () => {
    expect(getLegacySeverityFromScore(0.5)).toBe("MODERADO");
    expect(getLegacySeverityFromScore(0.2)).toBe("CRITICO");
  });
});

describe("SEVERITY_INFO usa tokens semânticos do design system", () => {
  it("nenhum nível usa cor Tailwind direta (emerald-*, red-*, etc.)", () => {
    for (const [, info] of Object.entries(SEVERITY_INFO)) {
      expect(info.color).toMatch(/^text-severity-/);
      expect(info.bgColor).toMatch(/^bg-severity-/);
    }
  });
});