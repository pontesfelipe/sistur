import type { Project, ProjectMilestone, ProjectTask } from "@/hooks/useProjects";
import type { BudgetLine } from "@/hooks/useProjectBudget";
import type { ProjectIndicatorImpact } from "@/hooks/useProjectIndicatorLinks";

export interface ExecutiveSummary {
  percentDone: number;
  tasksTotal: number;
  tasksDone: number;
  overdueTasks: ProjectTask[];
  blockedTasks: ProjectTask[];
  plannedBudget: number;
  actualBudget: number;
  budgetUsePct: number | null;
  risks: string[];
}

const today = () => new Date().toISOString().slice(0, 10);

/** Regras fixas do relatório executivo (sem IA) — mesmas entradas, mesmo texto. */
export function buildExecutiveSummary(
  tasks: ProjectTask[],
  milestones: ProjectMilestone[],
  budget: BudgetLine[],
  refDate: string = today(),
): ExecutiveSummary {
  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const percentDone = tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const overdueTasks = tasks.filter(
    (t) => t.status !== "done" && t.planned_end_date && t.planned_end_date.slice(0, 10) < refDate,
  );
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const active = budget.filter((b) => b.status !== "cancelled");
  const plannedBudget = active.reduce((s, b) => s + Number(b.planned_amount || 0), 0);
  const actualBudget = active.reduce((s, b) => s + Number(b.actual_amount || 0), 0);
  const budgetUsePct = plannedBudget > 0 ? Math.round((actualBudget / plannedBudget) * 100) : null;
  const lateMilestones = milestones.filter(
    (m) => m.status === "missed" || (m.status !== "completed" && m.target_date.slice(0, 10) < refDate),
  );

  const risks: string[] = [];
  if (overdueTasks.length) risks.push(`${overdueTasks.length} tarefa(s) com prazo vencido.`);
  if (blockedTasks.length) risks.push(`${blockedTasks.length} tarefa(s) bloqueada(s).`);
  if (lateMilestones.length) risks.push(`${lateMilestones.length} marco(s) atrasado(s) ou não cumprido(s).`);
  if (budgetUsePct !== null && budgetUsePct > 100)
    risks.push(`Gasto realizado acima do previsto (${budgetUsePct}% do orçamento).`);

  return { percentDone, tasksTotal, tasksDone, overdueTasks, blockedTasks, plannedBudget, actualBudget, budgetUsePct, risks };
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (d?: string | null) => (d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "—");
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const STATUS_LABEL: Record<string, string> = {
  ADEQUADO: "Adequado", ATENCAO: "Atenção", CRITICO: "Crítico",
};
const MS_LABEL: Record<string, string> = { pending: "Pendente", completed: "Concluído", missed: "Não cumprido" };

/** Abre o relatório executivo em nova janela pronto para imprimir/salvar em PDF. */
export function openExecutiveReport(
  project: Project,
  tasks: ProjectTask[],
  milestones: ProjectMilestone[],
  budget: BudgetLine[],
  indicators: ProjectIndicatorImpact[],
): boolean {
  const s = buildExecutiveSummary(tasks, milestones, budget);
  const plannedBudget = s.plannedBudget || Number(project.budget_estimated || 0);
  const actualBudget = s.actualBudget || Number(project.budget_actual || 0);
  const dest = project.destination ? `${project.destination.name}${project.destination.uf ? " / " + project.destination.uf : ""}` : "";

  const msRows = [...milestones]
    .sort((a, b) => a.target_date.localeCompare(b.target_date))
    .map((m) => `<tr><td>${esc(m.name)}</td><td>${date(m.target_date)}</td><td>${MS_LABEL[m.status] ?? m.status}</td></tr>`)
    .join("");
  const indRows = indicators
    .map((i) => {
      const d = i.delta;
      const trend = d === null ? "Sem nova medição" : d > 0 ? "Melhorou" : d < 0 ? "Piorou" : "Estável";
      return `<tr><td>${esc(i.indicator_name || i.indicator_code)}</td><td>${pct(i.baseline_score)}</td><td>${pct(i.current_score)}</td><td>${pct(i.target_score)}</td><td>${trend}${i.current_status ? " (" + (STATUS_LABEL[i.current_status] ?? i.current_status) + ")" : ""}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório executivo — ${esc(project.name)}</title>
<style>
@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#111;font-size:11pt;line-height:1.4}
h1{font-size:17pt;margin:0}h2{font-size:12.5pt;border-bottom:1px solid #999;padding-bottom:2px;margin:18px 0 6px}
.sub{color:#444;margin:2px 0 12px}.kpis{display:flex;gap:10px}.kpi{flex:1;border:1px solid #bbb;border-radius:6px;padding:8px}
.kpi b{display:block;font-size:15pt}table{width:100%;border-collapse:collapse;font-size:10pt}
th,td{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#eee}ul{margin:4px 0;padding-left:18px}
.foot{margin-top:20px;font-size:8.5pt;color:#555}@media print{.noprint{display:none}}
</style></head><body>
<button class="noprint" onclick="window.print()" style="float:right;padding:6px 12px">Imprimir / Salvar PDF</button>
<h1>Relatório executivo do projeto</h1>
<p class="sub"><b>${esc(project.name)}</b>${dest ? " — " + esc(dest) : ""}<br>Período planejado: ${date(project.planned_start_date)} a ${date(project.planned_end_date)} · Emitido em ${new Date().toLocaleDateString("pt-BR")}</p>
${project.description ? `<p>${esc(project.description)}</p>` : ""}
<h2>Situação geral</h2>
<div class="kpis">
<div class="kpi">Concluído<b>${s.percentDone}%</b>${s.tasksDone} de ${s.tasksTotal} tarefas</div>
<div class="kpi">Orçamento previsto<b>${brl(plannedBudget)}</b></div>
<div class="kpi">Realizado<b>${brl(actualBudget)}</b>${plannedBudget > 0 ? Math.round((actualBudget / plannedBudget) * 100) + "% do previsto" : ""}</div>
</div>
<h2>Pontos de atenção</h2>
${s.risks.length ? `<ul>${s.risks.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : "<p>Nenhum ponto de atenção no momento: sem tarefas vencidas, bloqueios ou marcos atrasados.</p>"}
${s.overdueTasks.length ? `<p><b>Tarefas vencidas:</b> ${s.overdueTasks.slice(0, 8).map((t) => esc(t.title) + " (" + date(t.planned_end_date) + ")").join("; ")}${s.overdueTasks.length > 8 ? "…" : ""}</p>` : ""}
<h2>Marcos</h2>
${msRows ? `<table><tr><th>Marco</th><th>Data prevista</th><th>Situação</th></tr>${msRows}</table>` : "<p>Nenhum marco cadastrado.</p>"}
<h2>Indicadores do diagnóstico (antes x agora)</h2>
${indRows ? `<table><tr><th>Indicador</th><th>Antes</th><th>Agora</th><th>Meta</th><th>Leitura</th></tr>${indRows}</table>` : "<p>Nenhum indicador vinculado a este projeto.</p>"}
<p class="foot">Gerado pelo SISTUR a partir das tarefas, marcos, orçamento e indicadores cadastrados no projeto. Os números refletem o que foi registrado pela equipe.</p>
<script>setTimeout(function(){window.print()},400)</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
