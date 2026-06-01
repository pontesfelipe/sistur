import type { ObservatoryMetric, ObservatorySummaryRow } from "@/hooks/useObservatorio";

/**
 * Gera CSV (separador `;`, encoding UTF-8 com BOM para Excel BR) do resumo do Observatório.
 */
export function buildObservatoryCsv(params: {
  orgName: string;
  year: number;
  metrics: ObservatoryMetric[];
  summary: ObservatorySummaryRow[];
}): string {
  const { orgName, year, metrics, summary } = params;
  const lines: string[] = [];
  lines.push(`Observatório Turístico;${orgName};Ano ${year}`);
  lines.push("");
  lines.push(["Categoria", "Código", "Indicador", "Unidade", "Total", "Média", "Registros"].join(";"));

  const fmt = (n: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);

  for (const m of metrics) {
    const s = summary.find((r) => r.metric_code === m.code);
    lines.push(
      [
        m.category,
        m.code,
        `"${m.name.replace(/"/g, '""')}"`,
        m.unit,
        s ? fmt(Number(s.total_value)) : "",
        s ? fmt(Number(s.avg_value)) : "",
        s ? String(s.data_points) : "0",
      ].join(";")
    );
  }

  // BOM para Excel reconhecer UTF-8
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}