// Registro das mudanças de regra que alteram o resultado de diagnósticos já calculados.
// Sempre que uma versão mudar o cálculo, acrescente uma entrada aqui: o aviso no topo
// do diagnóstico aparece sozinho para quem foi calculado antes da data.
export type DiagType = 'territorial' | 'enterprise';

export interface CalcRuleChange {
  version: string;
  date: string; // AAAA-MM-DD (início do dia, UTC)
  appliesTo: DiagType[];
  summary: string;
}

export const CALC_RULE_CHANGES: CalcRuleChange[] = [
  { version: '2.8.0', date: '2026-09-21', appliesTo: ['territorial', 'enterprise'],
    summary: 'Quórum mínimo de indicadores por pilar e reaproveitamento do último dado oficial válido quando a fonte não responde.' },
  { version: '2.31.6', date: '2026-10-03', appliesTo: ['territorial'],
    summary: 'O cálculo territorial passou a usar todos os dados oficiais disponíveis do município (só ficam de fora os recusados).' },
  { version: '2.49.0', date: '2026-10-08', appliesTo: ['territorial'],
    summary: 'Novo indicador de Maturidade Digital e Distribuição do Destino (pilar AO) no nível Estratégico, com nota de 0 a 100%.' },
];

/** Diagnósticos calculados há mais de N dias precisam de revisão manual. */
export const OUTDATED_DAYS = 90;

export type Staleness =
  | { level: 'ok'; missed: [] }
  | { level: 'updatable' | 'outdated'; missed: CalcRuleChange[]; dataChanged: boolean };

export function getStaleness(
  a: { status?: string | null; calculated_at?: string | null; diagnostic_type?: string | null; needs_recalculation?: boolean | null },
  now: Date = new Date(),
): Staleness {
  if (a.status !== 'CALCULATED' || !a.calculated_at) return { level: 'ok', missed: [] };
  const calc = new Date(a.calculated_at).getTime();
  const type: DiagType = a.diagnostic_type === 'enterprise' ? 'enterprise' : 'territorial';
  const missed = CALC_RULE_CHANGES.filter(c => c.appliesTo.includes(type) && new Date(c.date + 'T00:00:00Z').getTime() > calc);
  const dataChanged = !!a.needs_recalculation;
  if (!missed.length && !dataChanged) return { level: 'ok', missed: [] };
  const ageDays = (now.getTime() - calc) / 86_400_000;
  const outdated = ageDays > OUTDATED_DAYS;
  return { level: outdated ? 'outdated' : 'updatable', missed, dataChanged };
}
