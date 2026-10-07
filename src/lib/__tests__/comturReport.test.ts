import { describe, it, expect } from "vitest";
import { buildComturContent, FUMTUR_SOURCE } from "../comturReport";

const line = (o: any) => ({ status: "planned", planned_amount: 0, actual_amount: 0, funding_source: null, ...o });

describe("buildComturContent", () => {
  it("separa o FUMTUR e ignora linhas canceladas", () => {
    const c = buildComturContent([], [], [
      line({ funding_source: FUMTUR_SOURCE, planned_amount: 1000, actual_amount: 500 }),
      line({ funding_source: "Convênio MTur", planned_amount: 3000, actual_amount: 0 }),
      line({ funding_source: FUMTUR_SOURCE, planned_amount: 9999, status: "cancelled" }),
    ] as any, [], "2026-10-07");
    expect(c.totalPlanned).toBe(4000);
    expect(c.fumturPlanned).toBe(1000);
    expect(c.fumturActual).toBe(500);
    expect(c.financialText).toContain("(50%)");
  });

  it("lista tarefa vencida e marco atrasado como pendência", () => {
    const c = buildComturContent(
      [{ title: "Placas", status: "todo", planned_end_date: "2026-09-01" }] as any,
      [{ name: "Inauguração", status: "pending", target_date: "2026-09-15" }] as any,
      [], [], "2026-10-07",
    );
    expect(c.pendencies).toContain("Tarefa vencida: Placas (prazo 01/09/2026).");
    expect(c.pendencies).toContain("Marco atrasado: Inauguração.");
  });
});
