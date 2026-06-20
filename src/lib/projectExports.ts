import { buildICS, downloadICS, type ICSEvent } from "@/lib/icsExport";
import type { Project, ProjectMilestone, ProjectTask } from "@/hooks/useProjects";

export function exportProjectCalendar(
  project: Project,
  milestones: ProjectMilestone[],
  tasks: ProjectTask[],
) {
  const events: ICSEvent[] = [];
  milestones.forEach((m) => {
    if (!m.target_date) return;
    events.push({
      uid: `milestone-${m.id}`,
      title: `[Marco] ${m.name}`,
      description: m.description ?? `Marco do projeto ${project.name}`,
      start: new Date(m.target_date),
    });
  });
  tasks.forEach((t) => {
    const start = t.planned_start_date ?? t.planned_end_date;
    if (!start) return;
    events.push({
      uid: `task-${t.id}`,
      title: `[Tarefa] ${t.title}`,
      description: t.description ?? "",
      start: new Date(start),
      end: t.planned_end_date ? new Date(t.planned_end_date) : undefined,
    });
  });
  if (events.length === 0) return false;
  const ics = buildICS(events, `Projeto ${project.name}`);
  downloadICS(`projeto-${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`, ics);
  return true;
}

function escapeCSV(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportPortfolioCSV(rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => escapeCSV(r[h])).join(",")));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `portfolio-projetos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}