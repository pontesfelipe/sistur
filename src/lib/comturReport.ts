import type { Project, ProjectMilestone, ProjectTask } from "@/hooks/useProjects";
import type { BudgetLine } from "@/hooks/useProjectBudget";
import type { ProjectIndicatorImpact } from "@/hooks/useProjectIndicatorLinks";
import { buildExecutiveSummary } from "./projectExecutiveReport";

export const FUMTUR_SOURCE = "Fundo municipal (FUMTUR)";

export interface ComturMeta {
  meetingNumber: string;
  meetingDate: string; // YYYY-MM-DD
  periodStart: string;
  periodEnd: string;
  organName: string; // ex.: Secretaria Municipal de Turismo
  responsibleName: string;
  responsibleRole: string;
  purpose: "apreciacao" | "aprovacao";
}

export interface FinancialRow { source: string; planned: number; actual: number; isFumtur: boolean }

export interface ComturContent {
  financial: FinancialRow[];
  totalPlanned: number;
  totalActual: number;
  fumturPlanned: number;
  fumturActual: number;
  financialText: string;
  physicalText: string;
  pendencies: string[];
  milestonesDone: ProjectMilestone[];
  milestonesOpen: ProjectMilestone[];
  pillars: string[];
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Regras fixas do relatório ao COMTUR (sem IA): mesmos dados, mesmo texto. */
export function buildComturContent(
  tasks: ProjectTask[],
  milestones: ProjectMilestone[],
  budget: BudgetLine[],
  indicators: ProjectIndicatorImpact[],
  refDate: string = new Date().toISOString().slice(0, 10),
): ComturContent {
  const s = buildExecutiveSummary(tasks, milestones, budget, refDate);
  const active = budget.filter((b) => b.status !== "cancelled");
  const map = new Map<string, FinancialRow>();
  for (const l of active) {
    const source = l.funding_source?.trim() || "Não informada";
    const row = map.get(source) ?? { source, planned: 0, actual: 0, isFumtur: source === FUMTUR_SOURCE };
    row.planned += Number(l.planned_amount || 0);
    row.actual += Number(l.actual_amount || 0);
    map.set(source, row);
  }
  const financial = [...map.values()].sort((a, b) => b.planned - a.planned);
  const totalPlanned = financial.reduce((a, r) => a + r.planned, 0);
  const totalActual = financial.reduce((a, r) => a + r.actual, 0);
  const fum = financial.find((r) => r.isFumtur);
  const fumturPlanned = fum?.planned ?? 0;
  const fumturActual = fum?.actual ?? 0;

  let financialText: string;
  if (totalPlanned === 0) {
    financialText = "Não há valores de orçamento registrados para este projeto no período.";
  } else {
    const pct = Math.round((totalActual / totalPlanned) * 100);
    financialText = `Do total previsto de ${brl(totalPlanned)}, foram executados ${brl(totalActual)} (${pct}%).`;
    if (fumturPlanned > 0) {
      const fp = Math.round((fumturActual / fumturPlanned) * 100);
      financialText += ` Recursos do FUMTUR: previsto ${brl(fumturPlanned)}, executado ${brl(fumturActual)} (${fp}%).`;
    } else {
      financialText += " O projeto não utiliza recursos do FUMTUR.";
    }
  }

  const physicalText = s.tasksTotal
    ? `${s.tasksDone} de ${s.tasksTotal} tarefas concluídas (${s.percentDone}% de execução física).`
    : "Nenhuma tarefa cadastrada no projeto.";

  const pendencies: string[] = [];
  for (const t of s.overdueTasks) pendencies.push(`Tarefa vencida: ${t.title} (prazo ${t.planned_end_date?.slice(0, 10).split("-").reverse().join("/")}).`);
  for (const t of s.blockedTasks) pendencies.push(`Tarefa bloqueada: ${t.title}.`);
  const milestonesDone = milestones.filter((m) => m.status === "completed");
  const milestonesOpen = milestones.filter((m) => m.status !== "completed");
  for (const m of milestonesOpen) {
    if (m.status === "missed" || m.target_date.slice(0, 10) < refDate) pendencies.push(`Marco atrasado: ${m.name}.`);
  }
  if (totalPlanned > 0 && totalActual > totalPlanned) pendencies.push("Gasto executado acima do previsto.");
  for (const r of financial) if (r.source === "Não informada") pendencies.push("Há linhas de orçamento sem fonte de financiamento informada.");

  const pillars = [...new Set(indicators.map((i) => i.pillar).filter(Boolean) as string[])].sort();
  return { financial, totalPlanned, totalActual, fumturPlanned, fumturActual, financialText, physicalText, pendencies, milestonesDone, milestonesOpen, pillars };
}

export const PILLAR_NAMES: Record<string, string> = {
  RA: "Relações Ambientais (RA)", OE: "Organização Estrutural (OE)", AO: "Ações Operacionais (AO)",
};

export type { Project };
