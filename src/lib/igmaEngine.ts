/**
 * SISTUR - Motor de Interpretação IGMA
 * Implementação dos Princípios Sistêmicos de Mario Beni
 * 
 * IMPORTANTE: O backend (calculate-assessment edge function) é a FONTE ÚNICA DE VERDADE
 * para o cálculo do IGMA. Este módulo frontend é usado apenas para:
 * 1. Tipagem (interfaces e types)
 * 2. Helpers de exibição (labels, formatação)
 * 3. Re-interpretação de dados já calculados pelo backend
 * 
 * Qualquer alteração nas regras sistêmicas deve ser feita PRIMEIRO no backend
 * (supabase/functions/calculate-assessment/index.ts) e depois replicada aqui.
 */

// Types
export type PillarType = 'RA' | 'OE' | 'AO';
export type SeverityType = 'CRITICO' | 'MODERADO' | 'BOM';
export type TerritorialInterpretation = 'ESTRUTURAL' | 'GESTAO' | 'ENTREGA';

export interface PillarContext {
  pillar: PillarType;
  score: number;
  severity: SeverityType;
  trend?: 'UP' | 'DOWN' | 'STABLE';
}

export interface IGMAInput {
  pillarScores: PillarContext[];
  previousPillarScores?: PillarContext[];
  assessmentDate: Date;
  indicatorIntersetorialCount?: number;
}

export interface IGMAFlags {
  RA_LIMITATION: boolean;       // Regra 1: RA crítico bloqueia compensação
  GOVERNANCE_BLOCK: boolean;    // Regra 4: AO crítico bloqueia OE
  EXTERNALITY_WARNING: boolean; // Regra 3: OE subindo enquanto RA desce
  MARKETING_BLOCKED: boolean;   // Regra 5: Marketing bloqueado se RA/AO crítico
  INTERSECTORAL_DEPENDENCY: boolean; // Regra 6: Indicadores intersetoriais
}

export interface IGMAAllowedActions {
  EDU_RA: boolean;
  EDU_AO: boolean;
  EDU_OE: boolean;
  MARKETING: boolean;
}

export interface IGMAUIMessage {
  type: 'warning' | 'info' | 'critical';
  flag: keyof IGMAFlags;
  title: string;
  message: string;
  icon?: string;
}

export interface IGMAOutput {
  flags: IGMAFlags;
  allowedActions: IGMAAllowedActions;
  blockedActions: string[];
  uiMessages: IGMAUIMessage[];
  interpretationType: TerritorialInterpretation;
  nextReviewRecommendedAt: Date;
  criticalPillar?: PillarType;
}

/**
 * Motor de Interpretação IGMA
 * Aplica as 6 regras sistêmicas de Mario Beni
 */
export function interpretIGMA(input: IGMAInput): IGMAOutput {
  const { pillarScores, previousPillarScores, assessmentDate, indicatorIntersetorialCount = 0 } = input;
  
  // Initialize flags
  const flags: IGMAFlags = {
    RA_LIMITATION: false,
    GOVERNANCE_BLOCK: false,
    EXTERNALITY_WARNING: false,
    MARKETING_BLOCKED: false,
    INTERSECTORAL_DEPENDENCY: false,
  };
  
  const uiMessages: IGMAUIMessage[] = [];
  const blockedActions: string[] = [];
  
  // Get pillar contexts
  const RA = pillarScores.find(p => p.pillar === 'RA');
  const AO = pillarScores.find(p => p.pillar === 'AO');
  const OE = pillarScores.find(p => p.pillar === 'OE');
  
  // Previous scores for trend analysis
  const prevRA = previousPillarScores?.find(p => p.pillar === 'RA');
  const prevOE = previousPillarScores?.find(p => p.pillar === 'OE');
  
  // Find critical pillar
  const criticalPillar = pillarScores.reduce((prev, curr) => 
    curr.score < prev.score ? curr : prev
  ).pillar;
  
  // Determine primary interpretation type
  let interpretationType: TerritorialInterpretation = 'GESTAO';
  if (RA?.severity === 'CRITICO') {
    interpretationType = 'ESTRUTURAL';
  } else if (AO?.severity === 'CRITICO') {
    interpretationType = 'GESTAO';
  } else if (OE?.severity === 'CRITICO') {
    interpretationType = 'ENTREGA';
  }

  // ============================================================
  // REGRA 1 — LIMITAÇÃO ESTRUTURAL DO TERRITÓRIO (RA PRIORITÁRIO)
  // Se RA = CRÍTICO, o território apresenta limitações estruturais
  // ============================================================
  if (RA?.severity === 'CRITICO') {
    flags.RA_LIMITATION = true;
    blockedActions.push('EDU_OE');
    
    uiMessages.push({
      type: 'critical',
      flag: 'RA_LIMITATION',
      title: 'Limitação Estrutural do Território',
      message: 'O território apresenta limitações estruturais que comprometem a sustentabilidade do turismo, independentemente de ações de mercado ou gestão isoladas. Priorize capacitações em Relações Ambientais (RA).',
      icon: 'AlertTriangle',
    });
  }

  // ============================================================
  // REGRA 4 — GOVERNANÇA COMO CONDIÇÃO DE EFICÁCIA (AO CENTRAL)
  // Se AO = CRÍTICO, bloquear recomendações exclusivamente de OE
  // ============================================================
  if (AO?.severity === 'CRITICO') {
    flags.GOVERNANCE_BLOCK = true;
    if (!blockedActions.includes('EDU_OE')) {
      blockedActions.push('EDU_OE');
    }
    
    uiMessages.push({
      type: 'critical',
      flag: 'GOVERNANCE_BLOCK',
      title: 'Fragilidade de Governança',
      message: 'Fragilidades de governança comprometem a efetividade de ações de mercado e investimento no turismo. Priorize capacitações em Ações Operacionais (AO) antes de OE.',
      icon: 'ShieldAlert',
    });
  }

  // ============================================================
  // REGRA 3 — ALERTA DE EXTERNALIDADES NEGATIVAS
  // Se OE melhora enquanto RA piora → emitir alerta
  // ============================================================
  if (prevRA && prevOE && RA && OE) {
    const oeTrend = OE.score > prevOE.score ? 'UP' : (OE.score < prevOE.score ? 'DOWN' : 'STABLE');
    const raTrend = RA.score < prevRA.score ? 'DOWN' : (RA.score > prevRA.score ? 'UP' : 'STABLE');
    
    if (oeTrend === 'UP' && raTrend === 'DOWN') {
      flags.EXTERNALITY_WARNING = true;
      
      uiMessages.push({
        type: 'warning',
        flag: 'EXTERNALITY_WARNING',
        title: 'Alerta de Externalidades Negativas',
        message: 'O crescimento da oferta turística está ocorrendo sem a correspondente sustentabilidade territorial, gerando riscos de externalidades negativas. Recomenda-se equilibrar o desenvolvimento.',
        icon: 'TrendingUp',
      });
    }
  }

  // ============================================================
  // REGRA 5 — TERRITÓRIO ANTES DO MARKETING
  // Marketing só aparece se RA ≠ CRÍTICO e AO ≠ CRÍTICO
  // ============================================================
  if (RA?.severity === 'CRITICO' || AO?.severity === 'CRITICO') {
    flags.MARKETING_BLOCKED = true;
    blockedActions.push('MARKETING');
    
    uiMessages.push({
      type: 'warning',
      flag: 'MARKETING_BLOCKED',
      title: 'Marketing Temporariamente Bloqueado',
      message: 'A promoção turística deve ser precedida pela consolidação territorial e institucional. Resolva primeiro os gargalos de RA e/ou AO.',
      icon: 'Ban',
    });
  }

  // ============================================================
  // REGRA 6 — INTERSETORIALIDADE OBRIGATÓRIA
  // Indicadores de saúde, segurança, educação são intersetoriais
  // ============================================================
  if (indicatorIntersetorialCount > 0) {
    flags.INTERSECTORAL_DEPENDENCY = true;
    
    uiMessages.push({
      type: 'info',
      flag: 'INTERSECTORAL_DEPENDENCY',
      title: 'Dependência Intersetorial',
      message: `${indicatorIntersetorialCount} indicador(es) dependem de articulação intersetorial além da política de turismo (saúde, segurança, educação, saneamento).`,
      icon: 'Users',
    });
  }

  // ============================================================
  // REGRA 2 — PLANEJAMENTO COMO CICLO CONTÍNUO
  // Calcular próxima revisão recomendada baseada nos status
  // ============================================================
  let nextReviewMonths = 12; // default
  
  if (RA?.severity === 'CRITICO') {
    nextReviewMonths = 6; // RA crítico → revisão em 6 meses
  } else if (AO?.severity === 'CRITICO') {
    nextReviewMonths = 12; // AO crítico → revisão em 12 meses
  } else if (OE?.severity === 'CRITICO') {
    nextReviewMonths = 9; // OE crítico → revisão entre 6–12 meses (média: 9)
  } else if (RA?.severity === 'MODERADO' || AO?.severity === 'MODERADO' || OE?.severity === 'MODERADO') {
    nextReviewMonths = 12; // Atenção → revisão em 12 meses
  } else {
    nextReviewMonths = 18; // Tudo adequado → revisão em 18 meses
  }
  
  const nextReviewRecommendedAt = new Date(assessmentDate);
  nextReviewRecommendedAt.setMonth(nextReviewRecommendedAt.getMonth() + nextReviewMonths);

  // Calculate allowed actions
  const allowedActions: IGMAAllowedActions = {
    EDU_RA: true, // Sempre permitido
    EDU_AO: !flags.RA_LIMITATION, // Bloqueado se RA limitação (priorizar RA primeiro)
    EDU_OE: !flags.RA_LIMITATION && !flags.GOVERNANCE_BLOCK,
    MARKETING: !flags.MARKETING_BLOCKED,
  };

  return {
    flags,
    allowedActions,
    blockedActions,
    uiMessages,
    interpretationType,
    nextReviewRecommendedAt,
    criticalPillar,
  };
}

/**
 * Determina a severidade baseada no score (spec SISTUR)
 * Adequado: ≥0.67, Atenção: 0.34-0.66, Crítico: ≤0.33
 */
export function getSeverityFromScore(score: number): SeverityType {
  if (score <= 0.33) return 'CRITICO';
  if (score <= 0.66) return 'MODERADO';
  return 'BOM';
}

/**
 * Mapeia severity para labels de exibição
 */
export const SEVERITY_LABELS: Record<SeverityType, string> = {
  CRITICO: 'Crítico',
  MODERADO: 'Atenção',
  BOM: 'Adequado',
};

/**
 * Mapeia interpretation para labels de exibição
 */
export const INTERPRETATION_LABELS: Record<TerritorialInterpretation, string> = {
  ESTRUTURAL: 'Estrutural',
  GESTAO: 'Gestão',
  ENTREGA: 'Entrega',
};

/**
 * Mapeia pillar para nomes completos
 */
export const PILLAR_NAMES: Record<PillarType, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

/**
 * Textos automáticos para cada regra (Mario Beni)
 */
export const BENI_RULE_TEXTS = {
  RA_LIMITATION: 'O território apresenta limitações estruturais que comprometem a sustentabilidade do turismo, independentemente de ações de mercado ou gestão isoladas.',
  GOVERNANCE_BLOCK: 'Fragilidades de governança comprometem a efetividade de ações de mercado e investimento no turismo.',
  EXTERNALITY_WARNING: 'O crescimento da oferta turística está ocorrendo sem a correspondente sustentabilidade territorial, gerando riscos de externalidades negativas.',
  MARKETING_BLOCKED: 'A promoção turística deve ser precedida pela consolidação territorial e institucional.',
  INTERSECTORAL_DEPENDENCY: 'Este fator depende de articulação intersetorial além da política de turismo.',
  CONTINUOUS_PLANNING: 'O planejamento turístico deve ser continuamente revisto à luz da evolução territorial e institucional.',
};
