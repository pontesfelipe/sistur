import {
  AlignmentType, BorderStyle, Document, Footer, Header, Packer, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { saveAs } from "file-saver";
import { ABNT, ABNT_CONTENT_WIDTH, ABNT_DEFAULT_STYLES, ABNT_PAGE_PROPS } from "./abntStyle";
import type { Project, ProjectMilestone, ProjectTask } from "@/hooks/useProjects";
import type { BudgetLine } from "@/hooks/useProjectBudget";
import type { ProjectIndicatorImpact } from "@/hooks/useProjectIndicatorLinks";
import { buildComturContent, PILLAR_NAMES, type ComturMeta } from "./comturReport";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (d?: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const pct = (v: number | null) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`);

export const p = (text: string, o: { bold?: boolean; center?: boolean; indent?: boolean; size?: number } = {}) =>
  new Paragraph({
    alignment: o.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    indent: o.indent ? { firstLine: ABNT.FIRST_LINE_INDENT } : undefined,
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: o.bold, size: o.size })],
  });
export const h = (text: string) =>
  new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: text.toUpperCase(), bold: true, size: ABNT.H2_SIZE })] });

const border = { style: BorderStyle.SINGLE, size: 4, color: ABNT.COLOR_BORDER };
const borders = { top: border, bottom: border, left: border, right: border };
export function table(headers: string[], rows: string[][]): Table {
  const w = Math.floor(ABNT_CONTENT_WIDTH / headers.length);
  const widths = headers.map((_, i) => (i === headers.length - 1 ? ABNT_CONTENT_WIDTH - w * (headers.length - 1) : w));
  const cell = (t: string, i: number, head = false) =>
    new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA },
      shading: head ? { fill: "E6E6E6", type: ShadingType.CLEAR } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: head, size: ABNT.SMALL_SIZE })] })],
    });
  return new Table({
    width: { size: ABNT_CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: headers.map((t, i) => cell(t, i, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, i)) }))],
  });
}

export function deliberationBlock(signers: [string, string][]): (Paragraph | Table)[] {
  return [
    h("Parecer e deliberação do Conselho"),
    p("Votos: (   ) favoráveis   (   ) contrários   (   ) abstenções"),
    p("Deliberação: (   ) Aprovado   (   ) Aprovado com ressalvas   (   ) Reprovado"),
    p("Observações: ________________________________________________________________"),
    p("______________________________________________________________________________"),
    h("Assinaturas"),
    ...signers.flatMap(([name, role]) => [
      new Paragraph({ spacing: { before: 480 }, alignment: AlignmentType.CENTER, children: [new TextRun("______________________________________")] }),
      p(name || "Nome:", { center: true, bold: true }),
      p(role, { center: true }),
    ]),
  ];
}

export async function saveAbntDoc(headerText: string, children: (Paragraph | Table)[], filename: string) {
  const doc = new Document({
    styles: ABNT_DEFAULT_STYLES,
    sections: [{
      properties: ABNT_PAGE_PROPS,
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: headerText, bold: true, size: ABNT.SMALL_SIZE })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], size: ABNT.SMALL_SIZE })] })] }) },
      children,
    }],
  });
  saveAs(await Packer.toBlob(doc), filename);
}

export async function exportComturReport(
  project: Project, tasks: ProjectTask[], milestones: ProjectMilestone[], budget: BudgetLine[],
  indicators: ProjectIndicatorImpact[], meta: ComturMeta,
) {
  const c = buildComturContent(tasks, milestones, budget, indicators);
  const city = project.destination ? `${project.destination.name}${project.destination.uf ? " / " + project.destination.uf : ""}` : "";
  const header = `${meta.organName || "Secretaria Municipal de Turismo"}${city ? " — " + city : ""}`;
  const purpose = meta.purpose === "aprovacao" ? "aprovação" : "apreciação";

  const children: (Paragraph | Table)[] = [
    p("RELATÓRIO DE PRESTAÇÃO DE CONTAS AO CONSELHO MUNICIPAL DE TURISMO (COMTUR)", { bold: true, center: true, size: ABNT.H1_SIZE }),
    p(`Submetido para ${purpose} do Conselho`, { center: true }),
    h("1. Identificação"),
    table(["Item", "Informação"], [
      ["Município", city || "—"], ["Órgão responsável", meta.organName || "—"], ["Projeto", project.name],
      ["Período coberto", `${dt(meta.periodStart)} a ${dt(meta.periodEnd)}`],
      ["Reunião do COMTUR", `${meta.meetingNumber || "—"} — ${dt(meta.meetingDate)}`],
      ["Responsável técnico", `${meta.responsibleName || "—"}${meta.responsibleRole ? ", " + meta.responsibleRole : ""}`],
    ]),
    h("2. Objetivo e justificativa"),
    p(project.description || "Objetivo não descrito no cadastro do projeto.", { indent: true }),
    p(c.pillars.length
      ? `O projeto responde a indicadores do diagnóstico SISTUR do destino nos pilares: ${c.pillars.map((x) => PILLAR_NAMES[x] ?? x).join(", ")}.`
      : "O projeto não possui indicadores do diagnóstico vinculados.", { indent: true }),
    h("3. Execução física"),
    p(c.physicalText, { indent: true }),
    c.milestonesDone.length || c.milestonesOpen.length
      ? table(["Marco", "Data prevista", "Situação"], [...milestones].sort((a, b) => a.target_date.localeCompare(b.target_date))
          .map((m) => [m.name, dt(m.target_date), m.status === "completed" ? "Cumprido" : m.status === "missed" ? "Não cumprido" : "Pendente"]))
      : p("Nenhum marco cadastrado."),
    h("4. Execução financeira"),
    p(c.financialText, { indent: true }),
    c.financial.length
      ? table(["Fonte de financiamento", "Previsto", "Executado", "% executado"], [
          ...c.financial.map((r) => [r.isFumtur ? `${r.source} *` : r.source, brl(r.planned), brl(r.actual), r.planned ? `${Math.round((r.actual / r.planned) * 100)}%` : "—"]),
          ["Total", brl(c.totalPlanned), brl(c.totalActual), c.totalPlanned ? `${Math.round((c.totalActual / c.totalPlanned) * 100)}%` : "—"],
        ])
      : p("Sem linhas de orçamento."),
    ...(c.fumturPlanned > 0 ? [p("* Recursos do Fundo Municipal de Turismo, sujeitos à fiscalização deste Conselho.", { size: ABNT.SMALL_SIZE })] : []),
    h("5. Resultados nos indicadores"),
    p(indicators[0]?.is_newer_round
      ? `Comparação com a rodada mais recente do destino: ${indicators[0].current_assessment_title} (${dt(indicators[0].current_assessment_date)}).`
      : indicators.length ? "Ainda não há rodada de diagnóstico mais nova; os valores atuais são os do diagnóstico de origem." : "Nenhum indicador vinculado.", { indent: true }),
    ...(indicators.length ? [table(["Indicador", "Antes", "Agora", "Meta"], indicators.map((i) => [i.indicator_name || i.indicator_code, pct(i.baseline_score), pct(i.current_score), pct(i.target_score)]))] : []),
    h("6. Pendências e próximos passos"),
    ...(c.pendencies.length ? c.pendencies.map((x) => p(`– ${x}`)) : [p("Não há pendências registradas no período.")]),
    ...deliberationBlock([
      [meta.responsibleName, meta.responsibleRole || "Responsável técnico"],
      ["", "Secretário(a) Municipal de Turismo"],
      ["", "Presidente do COMTUR"],
    ]),
    p(`Documento gerado pelo SISTUR em ${new Date().toLocaleDateString("pt-BR")} a partir dos dados registrados no projeto.`, { size: ABNT.SMALL_SIZE }),
  ];
  const safe = project.name.replace(/[^\w-]+/g, "-").slice(0, 40);
  await saveAbntDoc(header, children, `prestacao-contas-comtur-${safe}.docx`);
}
