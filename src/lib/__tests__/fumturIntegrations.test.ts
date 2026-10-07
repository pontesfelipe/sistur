import { describe, it, expect } from "vitest";
import { accountabilityDeadline, convenioToBudgetLine, parseBalancete, reconcileBalancete, parseBRNumber } from "../fumturIntegrations";

const conv = { numero: "912345", objeto: "Sinalização turística", situacao: "Em execução", valor: 300000, valor_liberado: 0, contrapartida: 15000, fim_vigencia: "2026-12-31", orgao: "MTur" };

describe("convênios", () => {
  it("prazo de prestação de contas é 60 dias após o fim da vigência", () => {
    expect(accountabilityDeadline("2026-12-31")).toBe("2027-03-01");
  });
  it("não importa o mesmo convênio duas vezes", () => {
    expect(convenioToBudgetLine(conv, "p1", ["Convênio 912345 · Em execução"])).toBeNull();
    expect(convenioToBudgetLine(conv, "p1", [])?.funding_source).toBe("Convênio MTur");
  });
});

describe("balancete", () => {
  it("lê valor no formato brasileiro", () => {
    expect(parseBRNumber("R$ 1.234,56")).toBe(1234.56);
  });
  it("concilia por empenho: confere, diverge e falta", () => {
    const { rows } = parseBalancete("Empenho;Histórico;Valor pago\n0012;Placas;1.000,00\n15;Evento;500,00\n99;Outro;10,00");
    const r = reconcileBalancete(rows, [
      { id: "a", commitment_number: "12", actual_amount: 1000, description: "Placas" },
      { id: "b", commitment_number: "15", actual_amount: 400, description: "Evento" },
      { id: "c", commitment_number: null, actual_amount: 50, description: "Sem empenho" },
    ]);
    expect(r.matched.map((m) => m.expense.id)).toEqual(["a"]);
    expect(r.divergent[0].diff).toBe(100);
    expect(r.missingInSistur.map((m) => m.empenho)).toEqual(["99"]);
    expect(r.missingInBalancete.map((m) => m.id)).toEqual(["c"]);
  });
});
