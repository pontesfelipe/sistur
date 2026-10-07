import { describe, it, expect } from "vitest";
import { buildExecutiveSummary } from "../projectExecutiveReport";

const t = (o: any) => ({ status: "todo", planned_end_date: null, title: "x", ...o });

describe("buildExecutiveSummary", () => {
  it("calcula % concluído pelas tarefas", () => {
    const s = buildExecutiveSummary([t({ status: "done" }), t({}), t({}), t({ status: "done" })] as any, [], []);
    expect(s.percentDone).toBe(50);
  });
  it("aponta tarefas vencidas e marcos atrasados", () => {
    const s = buildExecutiveSummary(
      [t({ planned_end_date: "2026-01-01" }), t({ status: "done", planned_end_date: "2026-01-01" })] as any,
      [{ status: "pending", target_date: "2026-02-01" }] as any,
      [],
      "2026-10-07",
    );
    expect(s.overdueTasks).toHaveLength(1);
    expect(s.risks).toHaveLength(2);
  });
  it("alerta gasto acima do previsto e ignora linhas canceladas", () => {
    const s = buildExecutiveSummary([], [], [
      { planned_amount: 1000, actual_amount: 1200, status: "executed" },
      { planned_amount: 5000, actual_amount: 0, status: "cancelled" },
    ] as any);
    expect(s.budgetUsePct).toBe(120);
    expect(s.risks[0]).toContain("120%");
  });
});
