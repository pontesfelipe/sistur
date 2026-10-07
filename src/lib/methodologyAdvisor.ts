export type Methodology = 'waterfall' | 'safe' | 'scrum' | 'kanban';

export interface MethodologyAnswers {
  scope: 'fixed' | 'evolving';
  fixedStages: boolean; // convênio, licitação, emenda com etapas fixas
  teamSize: 'small' | 'medium' | 'large'; // até 5, 6–15, mais de 15 / vários órgãos
  deliveryType: 'physical' | 'service';
  meetingCadence: 'weekly' | 'monthly';
  workFlow: 'continuous' | 'deliverables';
}

export interface AdvisorContext {
  pillars?: string[];
  budget?: number | null;
}

export interface MethodologyAdvice {
  recommended: Methodology;
  alternative: Methodology;
  scores: Record<Methodology, number>;
  reasons: string[];
}

/** Regras fixas e explicáveis: mesmas respostas → mesma recomendação. */
export function adviseMethodology(a: MethodologyAnswers, ctx: AdvisorContext = {}): MethodologyAdvice {
  const s: Record<Methodology, number> = { waterfall: 0, safe: 0, scrum: 0, kanban: 0 };
  const why: Record<Methodology, string[]> = { waterfall: [], safe: [], scrum: [], kanban: [] };
  const add = (m: Methodology, pts: number, reason?: string) => {
    s[m] += pts;
    if (reason) why[m].push(reason);
  };

  if (a.scope === 'fixed') add('waterfall', 2, 'o escopo está bem definido');
  else { add('scrum', 2, 'o escopo pode mudar no caminho'); add('kanban', 1); }

  if (a.fixedStages) add('waterfall', 3, 'depende de convênio ou licitação com etapas fixas');

  if (a.teamSize === 'large') add('safe', 6, 'envolve equipe grande ou vários órgãos e parceiros');
  else if (a.teamSize === 'medium') { add('scrum', 1); add('safe', 1); }
  else { add('kanban', 1); add('scrum', 1, 'a equipe é pequena'); }

  if (a.deliveryType === 'physical') add('waterfall', 2, 'é obra ou estrutura física');
  else { add('scrum', 1, 'é serviço, campanha ou capacitação'); add('kanban', 1); }

  if (a.meetingCadence === 'weekly') { add('scrum', 2, 'a equipe consegue se reunir toda semana'); add('safe', 1); }
  else { add('waterfall', 1); add('kanban', 1, 'a equipe se reúne com pouca frequência'); }

  if (a.workFlow === 'continuous') add('kanban', 3, 'o trabalho chega em fluxo contínuo');
  else add('scrum', 1);

  if (ctx.pillars?.includes('OE')) add('waterfall', 1, 'os indicadores de Organização Estrutural costumam pedir etapas fixas');
  if (ctx.budget && ctx.budget >= 1_000_000) add('waterfall', 1, 'o orçamento é alto e exige prestação de contas por etapa');

  const order: Methodology[] = ['waterfall', 'scrum', 'kanban', 'safe'];
  const ranked = [...order].sort((x, y) => s[y] - s[x] || order.indexOf(x) - order.indexOf(y));
  return { recommended: ranked[0], alternative: ranked[1], scores: s, reasons: why[ranked[0]] };
}

export const METHODOLOGY_GUIDE: Record<Methodology, { whenToUse: string; whenToAvoid: string; example: string }> = {
  waterfall: {
    whenToUse: 'Escopo fechado, etapas obrigatórias, obras e convênios com prestação de contas.',
    whenToAvoid: 'Quando a solução ainda vai ser descoberta com o público.',
    example: 'Sinalização turística do centro histórico.',
  },
  scrum: {
    whenToUse: 'Entregas em ciclos curtos, com ajustes a partir do retorno do público.',
    whenToAvoid: 'Quando a equipe não consegue se reunir com frequência.',
    example: 'Campanha de divulgação do destino.',
  },
  kanban: {
    whenToUse: 'Demandas contínuas e rotina, sem data de fim definida.',
    whenToAvoid: 'Quando há um prazo único de entrega com etapas fixas.',
    example: 'Atendimento do Centro de Informações Turísticas.',
  },
  safe: {
    whenToUse: 'Programas grandes com vários órgãos, municípios ou equipes.',
    whenToAvoid: 'Projetos pequenos: o esforço de coordenação não compensa.',
    example: 'Programa regional de roteirização com vários municípios.',
  },
};
