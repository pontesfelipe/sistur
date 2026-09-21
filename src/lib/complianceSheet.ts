/**
 * Ficha de Conformidade Metodológica.
 *
 * Monta um anexo padronizado para os relatórios (Word/PDF) listando, por
 * indicador utilizado no diagnóstico: fonte, ano-base, método de coleta
 * (Automático / Manual / Estimado) e o percentual de dados auditados
 * (isto é, provenientes de fonte oficial automatizada).
 *
 * Serve para prestação de contas a conselhos de turismo, bancos e
 * auditorias ESG.
 */
import { supabase } from '@/integrations/supabase/client';

export type CollectionMethodLabel = 'Automático' | 'Manual' | 'Estimado';

export interface ComplianceRow {
  code: string;
  name: string;
  pillar: string | null;
  source: string;
  referenceYear: number | null;
  method: CollectionMethodLabel;
}

export interface ComplianceSheet {
  rows: ComplianceRow[];
  total: number;
  automatic: number;
  auditedPct: number;
}

function classifyMethod(source: string): CollectionMethodLabel {
  const s = (source || '').toLowerCase();
  if (/estimad/.test(s)) return 'Estimado';
  if (/\(auto\)|autom[áa]tic|ibge|datasus|stn|cadastur|mapa do turismo|mapa_turismo|anatel|anac|inep|tse|\bana\b|open-meteo|brasilapi|receita federal/.test(s)) {
    return 'Automático';
  }
  return 'Manual';
}

export async function fetchComplianceSheet(assessmentId: string): Promise<ComplianceSheet> {
  const [{ data: values }, { data: snapshots }] = await Promise.all([
    supabase
      .from('indicator_values')
      .select('value_raw, source, reference_date, indicators(code, name, pillar)')
      .eq('assessment_id', assessmentId),
    supabase
      .from('diagnosis_data_snapshots')
      .select('indicator_code, source_code, reference_year')
      .eq('assessment_id', assessmentId),
  ]);

  const snapshotByCode = new Map<string, { source_code: string; reference_year: number | null }>();
  (snapshots || []).forEach((s: any) => {
    snapshotByCode.set(s.indicator_code, { source_code: s.source_code, reference_year: s.reference_year ?? null });
  });

  const rows: ComplianceRow[] = (values || [])
    .filter((v: any) => v.indicators && v.value_raw !== null)
    .map((v: any) => {
      const code = v.indicators.code as string;
      const snap = snapshotByCode.get(code);
      const source = (v.source && String(v.source).trim()) || snap?.source_code || 'Não informado';
      const year =
        snap?.reference_year ??
        (v.reference_date ? Number(String(v.reference_date).slice(0, 4)) : null);
      return {
        code,
        name: v.indicators.name as string,
        pillar: (v.indicators.pillar as string) ?? null,
        source,
        referenceYear: Number.isFinite(year as number) ? (year as number) : null,
        method: classifyMethod(source),
      };
    })
    .sort((a, b) => (a.pillar || '').localeCompare(b.pillar || '') || a.code.localeCompare(b.code));

  const total = rows.length;
  const automatic = rows.filter((r) => r.method === 'Automático').length;
  const auditedPct = total > 0 ? Math.round((automatic / total) * 100) : 0;

  return { rows, total, automatic, auditedPct };
}

/** Gera o anexo em markdown, compatível com a renderização e o export Word. */
export function buildComplianceSheetMarkdown(sheet: ComplianceSheet): string {
  if (!sheet || sheet.total === 0) return '';
  const lines: string[] = [];
  lines.push('');
  lines.push('## Ficha de Conformidade Metodológica');
  lines.push('');
  lines.push(
    `Indicadores utilizados no diagnóstico: **${sheet.total}**. Dados auditados de fonte oficial automatizada: **${sheet.automatic} (${sheet.auditedPct}%)**. Os demais foram informados pela equipe local (manual) ou estimados.`,
  );
  lines.push('');
  lines.push('Tabela — Procedência dos dados por indicador');
  lines.push('');
  lines.push('| Pilar | Indicador | Fonte | Ano-base | Coleta |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const r of sheet.rows) {
    lines.push(
      `| ${r.pillar ?? '—'} | ${r.name} | ${r.source} | ${r.referenceYear ?? 'n/d'} | ${r.method} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}
