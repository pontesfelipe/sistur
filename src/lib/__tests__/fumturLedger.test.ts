import { describe, it, expect } from "vitest";
import { buildFumturLedger } from "../fumturLedger";

describe("buildFumturLedger", () => {
  it("saldo = inicial + receitas - gasto realizado (sem canceladas)", () => {
    const l = buildFumturLedger(1000, [{ amount: 500 }], [], [
      { project_id: "a", description: "x", actual_amount: 300, planned_amount: 300 },
      { project_id: "a", description: "y", actual_amount: 999, planned_amount: 0, status: "cancelled" },
    ]);
    expect(l.balance).toBe(1200);
  });

  it("alerta gasto de projeto fora do plano aprovado", () => {
    const l = buildFumturLedger(10000, [], [{ project_id: "a", action: "A", planned_amount: 5000, status: "approved" },
      { project_id: "b", action: "B", planned_amount: 5000, status: "proposed" }], [
      { project_id: "a", project_name: "A", description: "", actual_amount: 100, planned_amount: 0 },
      { project_id: "b", project_name: "B", description: "", actual_amount: 200, planned_amount: 0 },
    ]);
    expect(l.alerts.some((a) => a.includes("fora do Plano") && a.includes("B"))).toBe(true);
    expect(l.alerts.some((a) => a.includes(": A "))).toBe(false);
  });

  it("alerta gasto acima do saldo", () => {
    const l = buildFumturLedger(100, [], [], [{ project_id: "a", description: "", actual_amount: 300, planned_amount: 0 }]);
    expect(l.balance).toBe(-200);
    expect(l.alerts.some((a) => a.startsWith("Gastos acima do saldo"))).toBe(true);
  });
});
