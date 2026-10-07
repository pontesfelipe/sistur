import { describe, it, expect } from "vitest";
import { summarizeByFundingSource } from "@/hooks/useProjectBudget";

describe("summarizeByFundingSource", () => {
  it("soma por fonte e agrupa linhas sem fonte em 'Não informada'", () => {
    const r = summarizeByFundingSource([
      { funding_source: "Convênio MTur", planned_amount: 100, actual_amount: 40 },
      { funding_source: "Convênio MTur", planned_amount: 50, actual_amount: 10 },
      { funding_source: null, planned_amount: 30, actual_amount: 0 },
    ]);
    expect(r).toEqual([
      { source: "Convênio MTur", planned: 150, actual: 50 },
      { source: "Não informada", planned: 30, actual: 0 },
    ]);
  });
});
