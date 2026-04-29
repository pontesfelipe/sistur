/**
 * Single source of truth for status colors used across the report renderers
 * (DOCX, on-screen preview, PDF/print). Mirrored in
 * `supabase/functions/generate-report/index.ts` because Deno can't import @/lib.
 *
 * Status badge convention (canonical):
 *  - 🟢 EXCELENTE   ≥ 90%
 *  - 🔵 FORTE       80–89%
 *  - 🟡 ADEQUADO    67–79%
 *  - 🟠 ATENÇÃO     34–66%
 *  - 🔴 CRÍTICO     ≤ 33%
 *  - ⚪ INFORMATIVO (contextual / weight=0)
 *
 * Colors are HEX (no semantic tokens) because they must render identically
 * in print windows / iframes that don't carry CSS custom properties.
 */
export type CanonicalStatus =
  | 'EXCELENTE'
  | 'FORTE'
  | 'ADEQUADO'
  | 'ATENÇÃO'
  | 'CRITICO'
  | 'CRÍTICO'
  | 'INFORMATIVO';

export interface StatusStyle {
  /** HEX without leading # */
  bg: string;
  /** HEX without leading # */
  fg: string;
  emoji: string;
  label: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  EXCELENTE:    { bg: 'D1FADF', fg: '054F31', emoji: '🟢', label: 'EXCELENTE' },
  FORTE:        { bg: 'DBEAFE', fg: '1E3A8A', emoji: '🔵', label: 'FORTE' },
  ADEQUADO:     { bg: 'FEF3C7', fg: '78350F', emoji: '🟡', label: 'ADEQUADO' },
  ATENCAO:      { bg: 'FFEDD5', fg: '7C2D12', emoji: '🟠', label: 'ATENÇÃO' },
  CRITICO:      { bg: 'FEE2E2', fg: '7F1D1D', emoji: '🔴', label: 'CRÍTICO' },
  INFORMATIVO:  { bg: 'F1F5F9', fg: '334155', emoji: '⚪', label: 'INFORMATIVO' },
};

/** Normalize any user/AI provided status text to a canonical key. */
export function canonicalStatusKey(raw: string | null | undefined): keyof typeof STATUS_STYLES | null {
  if (!raw) return null;
  const t = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  if (t.includes('EXCEL')) return 'EXCELENTE';
  if (t.includes('FORTE')) return 'FORTE';
  if (t.includes('ADEQ') || t === 'BOM') return 'ADEQUADO';
  if (t.includes('ATENC') || t.includes('MODER')) return 'ATENCAO';
  if (t.includes('CRIT')) return 'CRITICO';
  if (t.includes('INFOR') || t.includes('CONTEXT') || t === 'N/A' || t === '—') return 'INFORMATIVO';
  return null;
}

export function getStatusStyle(raw: string | null | undefined): StatusStyle | null {
  const key = canonicalStatusKey(raw);
  return key ? STATUS_STYLES[key] : null;
}

/**
 * Detect whether a markdown table header is the canonical SISTUR indicator
 * table. Returns the index of the columns we know how to colorize.
 */
export interface TableColumnMap {
  statusIdx: number;
  valueIdx: number;
  unitIdx: number;
  sourceIdx: number;
}

export function mapIndicatorTableColumns(headers: string[]): TableColumnMap {
  const norm = headers.map(h =>
    h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(),
  );
  return {
    statusIdx: norm.findIndex(h => h === 'status' || h.startsWith('status')),
    valueIdx: norm.findIndex(h => h === 'valor' || h.startsWith('valor')),
    unitIdx: norm.findIndex(h => h === 'unidade' || h === 'un.' || h === 'un'),
    sourceIdx: norm.findIndex(h => h === 'fonte' || h.startsWith('fonte')),
  };
}
