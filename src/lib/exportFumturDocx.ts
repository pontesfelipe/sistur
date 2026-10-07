import { ABNT } from "./abntStyle";
import { deliberationBlock, h, p, saveAbntDoc, table } from "./exportComturDocx";
import type { FumturLedger } from "./fumturLedger";

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (d?: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");

export async function exportFumturAnnualReport(
  destName: string, year: number, fund: any, revenues: any[], plan: any[], expenses: any[], ledger: FumturLedger,
) {
  const children = [
    p(`RELATÓRIO ANUAL DO FUNDO MUNICIPAL DE TURISMO (FUMTUR) — ${year}`, { bold: true, center: true, size: ABNT.H1_SIZE }),
    p("Submetido à apreciação do Conselho Municipal de Turismo (COMTUR)", { center: true }),
    h("1. Identificação do fundo"),
    table(["Item", "Informação"], [["Município", destName], ["Lei de criação", fund.law_reference || "—"], ["CNPJ", fund.fund_cnpj || "—"], ["Conta", fund.bank_account || "—"]]),
    h("2. Resumo financeiro"),
    table(["Item", "Valor"], [["Saldo inicial", brl(fund.opening_balance)], ["Receitas", brl(ledger.totalRevenue)], ["Despesas realizadas", brl(ledger.totalSpent)], ["Saldo final", brl(ledger.balance)], ["Plano de Aplicação aprovado", brl(ledger.approvedPlan)]]),
    h("3. Receitas"),
    revenues.length ? table(["Data", "Origem", "Descrição", "Valor"], revenues.map((r) => [dt(r.revenue_date), r.origin, r.description || "", brl(r.amount)])) : p("Nenhuma receita registrada."),
    h("4. Plano de Aplicação"),
    plan.length ? table(["Ação", "Projeto", "Valor", "Situação"], plan.map((x) => [x.action, x.project_name || "—", brl(x.planned_amount), x.status === "approved" ? `Aprovado${x.approved_meeting ? " (" + x.approved_meeting + ")" : ""}` : "Proposto"])) : p("Nenhuma ação no plano."),
    h("5. Despesas"),
    expenses.length ? table(["Projeto", "Descrição", "Empenho / etapa", "Realizado"], expenses.filter((e) => e.status !== "cancelled").map((e) => [e.project_name, e.description, `${e.commitment_number || "—"}${e.execution_stage ? " / " + e.execution_stage : ""}`, brl(e.actual_amount)])) : p("Nenhuma despesa registrada."),
    h("6. Pontos de atenção"),
    ...(ledger.alerts.length ? ledger.alerts.map((a) => p(`– ${a}`)) : [p("Nenhum ponto de atenção: gastos dentro do plano aprovado e do saldo.")]),
    ...deliberationBlock([["", "Gestor(a) do FUMTUR"], ["", "Secretário(a) Municipal de Turismo"], ["", "Presidente do COMTUR"]]),
    p(`Documento gerado pelo SISTUR em ${new Date().toLocaleDateString("pt-BR")} a partir dos dados registrados.`, { size: ABNT.SMALL_SIZE }),
  ];
  await saveAbntDoc(`Fundo Municipal de Turismo — ${destName}`, children, `fumtur-${year}.docx`);
}
