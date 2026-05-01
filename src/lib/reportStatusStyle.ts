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

/**
 * Defensive realigner for the canonical indicator table:
 * | Indicador | Valor | Unidade | Status | Fonte |
 *
 * The LLM occasionally emits a row with a missing cell (typically the
 * numeric "Valor"), which causes every subsequent column to shift one to
 * the left in the rendered table (out-of-square row).
 *
 * This function detects that case heuristically — based on emoji, known
 * source codes and unit patterns — and reinserts a placeholder ("—") at
 * the missing position so the row aligns with the header again.
 *
 * Returns the row unchanged when the table is not the canonical one or
 * when the cell count already matches the header.
 */
const KNOWN_SOURCES = /^(IBGE|DATASUS|STN|CADASTUR|MTUR|MAPA[_ ]?TUR(ISMO)?|INEP|ANA|ANATEL|TSE|SEEG|ANAC|CADUNICO|MANUAL|KB|PESQUISA[_ ]?LOCAL|DERIVADO|OFICIAL.*)$/i;
const STATUS_EMOJI_RE = /[🟢🔵🟡🟠🔴⚪]/u;
const UNIT_RE = /^(%|R\$|hab\.?|dias?|score [^|]+|nota[^|]*|segmentos?|leitos?|km2?|—|-)$/i;

export function realignIndicatorRow(
  row: string[],
  headers: string[],
  colMap: TableColumnMap,
): string[] {
  const expected = headers.length;
  if (row.length === expected) return row;
  if (row.length > expected) return row.slice(0, expected);

  // Only realign the canonical indicator table — needs at least Status + Fonte.
  const isCanonical = colMap.statusIdx >= 0 && colMap.sourceIdx >= 0 && colMap.valueIdx >= 0;
  if (!isCanonical) {
    // Pad to the right with em dashes to keep columns square.
    return [...row, ...Array(expected - row.length).fill('—')];
  }

  // Identify which header each existing cell most likely matches.
  const out: string[] = Array(expected).fill('');
  const used: boolean[] = Array(row.length).fill(false);

  // 1) Indicador = first cell with letters and not an emoji/source/unit.
  const indicadorIdx = 0; // header position for "Indicador"
  for (let i = 0; i < row.length; i++) {
    const c = row[i].trim();
    if (c && !STATUS_EMOJI_RE.test(c) && !KNOWN_SOURCES.test(c) && !UNIT_RE.test(c)) {
      out[indicadorIdx] = c;
      used[i] = true;
      break;
    }
  }

  // 2) Status = cell with status emoji.
  for (let i = 0; i < row.length; i++) {
    if (used[i]) continue;
    if (STATUS_EMOJI_RE.test(row[i])) {
      out[colMap.statusIdx] = row[i].trim();
      used[i] = true;
      break;
    }
  }

  // 3) Fonte = cell matching a known source code.
  for (let i = row.length - 1; i >= 0; i--) {
    if (used[i]) continue;
    if (KNOWN_SOURCES.test(row[i].trim())) {
      out[colMap.sourceIdx] = row[i].trim();
      used[i] = true;
      break;
    }
  }

  // 4) Unidade = remaining short cell matching unit pattern.
  if (colMap.unitIdx >= 0) {
    for (let i = 0; i < row.length; i++) {
      if (used[i]) continue;
      if (UNIT_RE.test(row[i].trim())) {
        out[colMap.unitIdx] = row[i].trim();
        used[i] = true;
        break;
      }
    }
  }

  // 5) Valor = remaining cell (numeric or fallback).
  for (let i = 0; i < row.length; i++) {
    if (used[i]) continue;
    if (!out[colMap.valueIdx]) {
      out[colMap.valueIdx] = row[i].trim();
      used[i] = true;
    }
  }

  // Fill any still-empty cell with em dash placeholder.
  for (let i = 0; i < expected; i++) {
    if (!out[i]) out[i] = '—';
  }
  return out;
}
