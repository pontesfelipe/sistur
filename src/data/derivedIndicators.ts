/**
 * Catalog of indicators that are CALCULATED AUTOMATICALLY by the
 * `calculate-assessment` edge function (or DB functions).
 *
 * Users should NOT fill these in manually — the value is derived from
 * other inputs and/or official datasets. The diagnostic UI uses this
 * catalog to show a "Calculated automatically" banner with the formula
 * and the inputs the user must guarantee are filled.
 */

export interface DerivedIndicatorInfo {
  /** Plain-Portuguese formula description */
  formula: string;
  /** Indicator codes (or external sources) that must be present for the calculation to run */
  requiredInputs: string[];
  /** Resulting unit shown to the user */
  resultUnit: string;
  /** Optional extra note (data provenance, fallback behavior, etc.) */
  note?: string;
}

export const DERIVED_INDICATORS: Record<string, DerivedIndicatorInfo> = {
  igma_ipcr: {
    formula:
      'IPCR = (PIB per capita do município ÷ PIB per capita do Brasil) × 100',
    requiredInputs: [
      'igma_pib_per_capita (IBGE — automático)',
      'PIB per capita nacional (referência IBGE — automático)',
    ],
    resultUnit: 'índice (Brasil = 100)',
    note: 'Calculado no recálculo do diagnóstico. Procedência: derivado IBGE.',
  },
  igma_ideb: {
    formula: 'IDEB = média entre IDEB anos iniciais e IDEB anos finais (INEP)',
    requiredInputs: [
      'igma_resultado_ideb_anos_iniciais_do_ensino_fundamental (INEP)',
      'igma_resultado_ideb_anos_finais_do_ensino_fundamental (INEP)',
    ],
    resultUnit: 'nota (0–10)',
    note: 'Substitui o preenchimento manual. Se apenas um dos componentes existir, será usado isoladamente.',
  },
  igma_leitos_hospedagem_por_habitante: {
    formula: 'Leitos por hab. = (leitos de hospedagem CADASTUR ÷ população) × 1000',
    requiredInputs: ['igma_leitos_hospedagem (CADASTUR)', 'igma_populacao (IBGE)'],
    resultUnit: 'leitos por mil habitantes',
    note: 'Não confundir com leitos hospitalares SUS (igma_leitos_hospitalares_sus_por_mil_habitantes — DATASUS).',
  },
  tourism_revenue_per_capita: {
    formula:
      'Receita per capita = ((visitantes nacionais × gasto médio diário × permanência) + (visitantes internacionais × gasto médio diário × permanência)) ÷ população',
    requiredInputs: [
      'igma_populacao',
      'igma_visitantes_nacionais',
      'igma_visitantes_internacionais',
      'Tabela de gastos médios por UF (referência interna)',
    ],
    resultUnit: 'R$ por habitante/ano',
    note: 'Usa valores de referência da MTur/FGV quando dados específicos da UF não estão disponíveis.',
  },
  igma_iptl: {
    formula:
      'IPTL = (visitantes totais ÷ população residente) — pressão turística sobre o território',
    requiredInputs: [
      'igma_populacao',
      'igma_visitantes_nacionais',
      'igma_visitantes_internacionais',
    ],
    resultUnit: 'índice (visitantes por habitante)',
    note: 'Sinaliza risco de overtourism quando excede limites da capacidade de carga.',
  },
  igma_iiet: {
    formula:
      'IIET = participação do setor turismo (alojamento, alimentação, transporte) sobre o PIB municipal',
    requiredInputs: [
      'igma_pib_municipal',
      'igma_empregos_turismo (RAIS/CAGED)',
    ],
    resultUnit: 'índice (% do PIB)',
    note: 'Composto a partir de dados oficiais RAIS/CAGED + PIB municipal IBGE.',
  },
  igma_isemt: {
    formula:
      'I_SEMT = média ponderada de IPCR (40%) + IIET (35%) + IPTL invertido (25%)',
    requiredInputs: ['igma_ipcr', 'igma_iiet', 'igma_iptl'],
    resultUnit: 'índice (0–100)',
    note: 'Índice composto. Calculado após os três componentes estarem disponíveis.',
  },
};

export function getDerivedIndicatorInfo(code: string): DerivedIndicatorInfo | undefined {
  return DERIVED_INDICATORS[code];
}

export function isDerivedIndicator(code: string): boolean {
  return code in DERIVED_INDICATORS;
}