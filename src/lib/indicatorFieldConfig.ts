import { formatIndicatorValueBR } from '@/data/enterpriseIndicatorGuidance';

export const EMPTY_SELECT_VALUE = '__empty__';

export interface IndicatorFieldOption {
  value: string;
  numericValue: number;
  label: string;
}

type IndicatorLike = {
  code?: string | null;
  normalization?: string | null;
  unit?: string | null;
};

type IndicatorFieldConfig =
  | { kind: 'number' }
  | { kind: 'select'; options: IndicatorFieldOption[] };

const BINARY_OPTIONS: IndicatorFieldOption[] = [
  { value: '1', numericValue: 1, label: 'Sim' },
  { value: '0', numericValue: 0, label: 'Não' },
];

const SCORE_1_5_OPTIONS: IndicatorFieldOption[] = [
  { value: '1', numericValue: 1, label: '1' },
  { value: '2', numericValue: 2, label: '2' },
  { value: '3', numericValue: 3, label: '3' },
  { value: '4', numericValue: 4, label: '4' },
  { value: '5', numericValue: 5, label: '5' },
];

const NOTA_0_10_OPTIONS: IndicatorFieldOption[] = Array.from({ length: 11 }, (_, i) => ({
  value: String(i),
  numericValue: i,
  label: String(i),
}));

const OPTIONS_BY_CODE: Record<string, IndicatorFieldOption[]> = {
  igma_categoria_mapa_turismo: [
    { value: '5', numericValue: 5, label: 'A' },
    { value: '4', numericValue: 4, label: 'B' },
    { value: '3', numericValue: 3, label: 'C' },
    { value: '2', numericValue: 2, label: 'D' },
    { value: '1', numericValue: 1, label: 'E' },
  ],
};

const BINARY_CODES = new Set([
  'AO_PLANO_TURISMO',
  'AO_CONSELHO_TURISMO',
  'igma_regiao_turistica',
  'igma_conselho_municipal_turismo',
]);

const SCORE_1_5_UNITS = new Set(['score 1-5']);
const NOTA_0_10_UNITS = new Set(['nota 0-10']);

export function getIndicatorFieldConfig(indicator?: IndicatorLike | null): IndicatorFieldConfig {
  const code = indicator?.code?.trim();

  if (code && OPTIONS_BY_CODE[code]) {
    return { kind: 'select', options: OPTIONS_BY_CODE[code] };
  }

  if (indicator?.normalization === 'BINARY' || (code && BINARY_CODES.has(code))) {
    return { kind: 'select', options: BINARY_OPTIONS };
  }

  return { kind: 'number' };
}

export function isSelectIndicatorField(indicator?: IndicatorLike | null) {
  return getIndicatorFieldConfig(indicator).kind === 'select';
}

export function getIndicatorSelectValue(
  numericValue: number | null | undefined,
  indicator?: IndicatorLike | null,
): string {
  const config = getIndicatorFieldConfig(indicator);
  if (config.kind !== 'select' || numericValue === null || numericValue === undefined) return '';

  return config.options.find((option) => option.numericValue === numericValue)?.value ?? '';
}

export function parseIndicatorSelectValue(
  selectedValue: string,
  indicator?: IndicatorLike | null,
): number | null {
  if (!selectedValue || selectedValue === EMPTY_SELECT_VALUE) return null;

  const config = getIndicatorFieldConfig(indicator);
  if (config.kind !== 'select') return null;

  return config.options.find((option) => option.value === selectedValue)?.numericValue ?? null;
}

export function validateIndicatorSelectValue(
  selectedValue: string,
  indicator?: IndicatorLike | null,
): string | null {
  if (!selectedValue || selectedValue === EMPTY_SELECT_VALUE) return null;

  const config = getIndicatorFieldConfig(indicator);
  if (config.kind !== 'select') return null;

  return config.options.some((option) => option.value === selectedValue)
    ? null
    : 'Selecione uma opção válida';
}

export function formatIndicatorFieldDisplayValue(
  value: number | null | undefined,
  indicator?: IndicatorLike | null,
): string {
  const config = getIndicatorFieldConfig(indicator);
  if (config.kind === 'select') {
    if (value === null || value === undefined) return '';
    return config.options.find((option) => option.numericValue === value)?.label ?? String(value);
  }

  return formatIndicatorValueBR(value, indicator ?? undefined);
}