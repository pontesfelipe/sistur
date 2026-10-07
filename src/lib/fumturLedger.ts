export interface FumturRevenue { amount: number }
export interface FumturPlanItem { id?: string; project_id: string | null; action: string; planned_amount: number; status: string }
export interface FumturExpense { project_id: string; project_name?: string; description: string; actual_amount: number; planned_amount: number; status?: string }

export interface FumturLedger {
  totalRevenue: number;
  totalSpent: number;
  balance: number;
  approvedPlan: number;
  planUsePct: number | null;
  alerts: string[];
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Saldo e alertas do FUMTUR por regras fixas. Despesa = valor realizado das linhas de orçamento com fonte FUMTUR. */
export function buildFumturLedger(
  openingBalance: number,
  revenues: FumturRevenue[],
  plan: FumturPlanItem[],
  expenses: FumturExpense[],
): FumturLedger {
  const valid = expenses.filter((e) => e.status !== "cancelled");
  const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalSpent = valid.reduce((s, e) => s + Number(e.actual_amount || 0), 0);
  const balance = Number(openingBalance || 0) + totalRevenue - totalSpent;
  const approved = plan.filter((p) => p.status === "approved");
  const approvedPlan = approved.reduce((s, p) => s + Number(p.planned_amount || 0), 0);
  const planUsePct = approvedPlan > 0 ? Math.round((totalSpent / approvedPlan) * 100) : null;

  const alerts: string[] = [];
  const approvedProjects = new Set(approved.map((p) => p.project_id).filter(Boolean));
  const outside = new Map<string, number>();
  for (const e of valid) {
    if (Number(e.actual_amount || 0) > 0 && !approvedProjects.has(e.project_id)) {
      const k = e.project_name || e.project_id;
      outside.set(k, (outside.get(k) ?? 0) + Number(e.actual_amount));
    }
  }
  for (const [name, v] of outside) alerts.push(`Gasto fora do Plano de Aplicação aprovado: ${name} (${brl(v)}).`);
  if (balance < 0) alerts.push(`Gastos acima do saldo do fundo (saldo ${brl(balance)}).`);
  if (approvedPlan > 0 && totalSpent > approvedPlan) alerts.push(`Gastos acima do Plano de Aplicação aprovado (${planUsePct}%).`);
  return { totalRevenue, totalSpent, balance, approvedPlan, planUsePct, alerts };
}

export const FUMTUR_REVENUE_ORIGINS = [
  "Repasse da prefeitura", "ICMS Turístico", "Taxas e licenças", "Multas", "Doações", "Convênios", "Rendimentos", "Outra",
];
export const FUMTUR_EXECUTION_STAGES = [
  { value: "empenhado", label: "Empenhado" }, { value: "liquidado", label: "Liquidado" }, { value: "pago", label: "Pago" },
];
