/**
 * Centralized formatting for indicator values based on the canonical
 * `value_format` flag stored at the database level.
 *
 * This file is the single source of truth for how an indicator's raw
 * numeric value should be rendered (in dashboards, tables, reports).
 *
 * Mirror file used by edge functions: see inline copy in
 * `supabase/functions/generate-report/index.ts` (Deno cannot import @/lib).
 */

export type ValueFormat =
  | 'PERCENTAGE'
  | 'RATIO'
  | 'INDEX_SCORE'
  | 'CURRENCY'
  | 'CURRENCY_THOUSANDS'
  | 'CURRENCY_MILLIONS'
  | 'COUNT'
  | 'RATE_PER_CAPITA'
  | 'DURATION'
  | 'AREA'
  | 'BINARY'
  | 'CATEGORICAL'
  | 'NUMERIC';

export const VALUE_FORMAT_LABELS: Record<ValueFormat, string> = {
  PERCENTAGE: 'Porcentagem (%)',
  RATIO: 'Razão (0-1)',
  INDEX_SCORE: 'Índice / Score',
  CURRENCY: 'Moeda (R$)',
  CURRENCY_THOUSANDS: 'Moeda em milhares (R$ mil)',
  CURRENCY_MILLIONS: 'Moeda em milhões (R$ mi)',
  COUNT: 'Contagem (unidades)',
  RATE_PER_CAPITA: 'Taxa per capita',
  DURATION: 'Duração (tempo)',
  AREA: 'Área / Densidade',
  BINARY: 'Binário (sim/não)',
  CATEGORICAL: 'Categórico (letras)',
  NUMERIC: 'Numérico genérico',
};

export const VALUE_FORMAT_DESCRIPTIONS: Record<ValueFormat, string> = {
  PERCENTAGE: 'Valor expresso de 0 a 100, exibido com sufixo %.',
  RATIO: 'Valor de 0 a 1, exibido como fração decimal.',
  INDEX_SCORE: 'Escalas como IQA (0-100), score 1-5, nota 0-10.',
  CURRENCY: 'Valor monetário em reais, exibido como R$ X,XX.',
  CURRENCY_THOUSANDS: 'Valor já em milhares — exibido como R$ X mil.',
  CURRENCY_MILLIONS: 'Valor já em milhões — exibido como R$ X mi.',
  COUNT: 'Contagem absoluta sem casas decimais (eventos, voos, unidades).',
  RATE_PER_CAPITA: 'Taxa por mil/100 mil habitantes ou similar — exibido com a unidade.',
  DURATION: 'Duração temporal (horas, dias, anos).',
  AREA: 'Área ou densidade espacial (km², hab./km²).',
  BINARY: 'Sim/Não (1 = sim, 0 = não).',
  CATEGORICAL: 'Categoria/letra (ex: A, B, C, D).',
  NUMERIC: 'Sem regra específica — exibido com até 2 casas decimais.',
};

interface IndicatorLike {
  code?: string | null;
  unit?: string | null;
  value_format?: ValueFormat | string | null;
  normalization?: string | null;
}

/**
 * Returns the canonical `value_format` for an indicator. Falls back to
 * inference from `unit`/`normalization` when the column is missing
 * (e.g. legacy code paths or partially-typed objects).
 */
export function resolveValueFormat(indicator?: IndicatorLike | null): ValueFormat {
  const explicit = indicator?.value_format;
  if (explicit && typeof explicit === 'string') {
    return explicit as ValueFormat;
  }
  return inferValueFormatFromUnit(indicator?.unit ?? null, indicator?.normalization ?? null);
}

export function inferValueFormatFromUnit(
  unit?: string | null,
  normalization?: string | null,
): ValueFormat {
  if (normalization === 'BINARY') return 'BINARY';
  if (!unit) return 'NUMERIC';
  const u = unit.toLowerCase().trim();

  if (u === '%' || u === 'pct' || u === 'percent') return 'PERCENTAGE';
  if (u === 'índice 0-1' || u === 'indice 0-1') return 'RATIO';
  if (
    u === 'índice' || u === 'indice' || u === 'iqa' || u === 'iqa (0-100)' ||
    u === 'score' || u === 'score 1-5' || u === 'score -100 a 100' ||
    u === 'nota' || u === 'nota 0-10'
  ) return 'INDEX_SCORE';
  if (u === 'r$ mi') return 'CURRENCY_MILLIONS';
  if (u.startsWith('r$') || u.includes('reais')) return 'CURRENCY';
  if (u.includes('por mil') || u.includes('por 100')) return 'RATE_PER_CAPITA';
  if (['horas/ano', 'minutos', 'dias', 'anos', 'horas', 'segundos'].includes(u)) return 'DURATION';
  if (u === 'km²' || u.includes('/km²')) return 'AREA';
  if (u === 'binário' || u === 'binario' || u === 'sim/não' || u === 'sim/nao') return 'BINARY';
  if (u === 'categoria' || u === 'nota a-d') return 'CATEGORICAL';
  if (
    ['unidades', 'unidade', 'un', 'eventos/ano', 'voos/sem', 'turistas/ano',
     'segmentos', 'habitantes', 'hab', 'qtd'].includes(u)
  ) return 'COUNT';

  return 'NUMERIC';
}

const CATEGORICAL_LETTERS: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };

/**
 * Format an indicator value according to its semantic flag.
 * Always returns a Brazilian-locale string (vírgula decimal, ponto de milhar).
 */
export function formatIndicatorValue(
  value: number | null | undefined,
  indicator?: IndicatorLike | null,
  options: { includeUnit?: boolean } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const format = resolveValueFormat(indicator);
  const includeUnit = options.includeUnit !== false;

  switch (format) {
    case 'PERCENTAGE':
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}${includeUnit ? '%' : ''}`;
    case 'RATIO':
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    case 'INDEX_SCORE':
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    case 'CURRENCY':
      return `${includeUnit ? 'R$ ' : ''}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'CURRENCY_THOUSANDS':
      return `${includeUnit ? 'R$ ' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${includeUnit ? ' mil' : ''}`;
    case 'CURRENCY_MILLIONS':
      return `${includeUnit ? 'R$ ' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${includeUnit ? ' mi' : ''}`;
    case 'COUNT':
      return Math.round(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    case 'RATE_PER_CAPITA':
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    case 'DURATION':
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    case 'AREA':
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    case 'BINARY':
      return value >= 0.5 ? 'Sim' : 'Não';
    case 'CATEGORICAL':
      return CATEGORICAL_LETTERS[Math.round(value)] ?? value.toLocaleString('pt-BR');
    case 'NUMERIC':
    default:
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}

/**
 * Compose `<formatted value> <unit>` for human-readable display
 * (e.g. tables, charts, report text).
 */
export function formatIndicatorValueWithUnit(
  value: number | null | undefined,
  indicator?: IndicatorLike | null,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const formatted = formatIndicatorValue(value, indicator, { includeUnit: true });
  const format = resolveValueFormat(indicator);

  // For these formats the unit symbol is already embedded in the formatted output
  if (['PERCENTAGE', 'CURRENCY', 'CURRENCY_THOUSANDS', 'CURRENCY_MILLIONS', 'BINARY', 'CATEGORICAL'].includes(format)) {
    return formatted;
  }

  const unit = indicator?.unit?.trim();
  return unit ? `${formatted} ${unit}` : formatted;
}
