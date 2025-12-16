// SISTUR Type Definitions

export type Pillar = 'RA' | 'OE' | 'AO';
export type Severity = 'CRITICO' | 'MODERADO' | 'BOM';
export type TerritorialInterpretation = 'ESTRUTURAL' | 'GESTAO' | 'ENTREGA';
export type AssessmentStatus = 'DRAFT' | 'DATA_READY' | 'CALCULATED';
export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER';
export type CourseLevel = 'BASICO' | 'INTERMEDIARIO' | 'AVANCADO';
export type TargetAgent = 'GESTORES' | 'TECNICOS' | 'TRADE';
export type EvolutionState = 'EVOLUTION' | 'STAGNATION' | 'REGRESSION';

export interface Org {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  user_id: string;
  org_id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

export interface Destination {
  id: string;
  org_id: string;
  name: string;
  uf: string;
  ibge_code?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface Assessment {
  id: string;
  org_id: string;
  destination_id: string;
  destination?: Destination;
  title: string;
  period_start?: string;
  period_end?: string;
  status: AssessmentStatus;
  algo_version: string;
  calculated_at?: string;
  created_at: string;
}

export interface Indicator {
  id: string;
  org_id?: string;
  code: string;
  name: string;
  pillar: Pillar;
  theme: string;
  description?: string;
  unit?: string;
  direction: 'HIGH_IS_BETTER' | 'LOW_IS_BETTER';
  normalization: 'MIN_MAX' | 'BANDS' | 'BINARY';
  min_ref?: number;
  max_ref?: number;
  weight: number;
  created_at: string;
}

export interface IndicatorValue {
  id: string;
  org_id: string;
  assessment_id: string;
  indicator_id: string;
  indicator?: Indicator;
  value_raw?: number;
  value_text?: string;
  source: string;
  collected_at: string;
  created_at: string;
}

export interface IndicatorScore {
  id: string;
  org_id: string;
  assessment_id: string;
  indicator_id: string;
  indicator?: Indicator;
  score: number;
  min_ref_used?: number;
  max_ref_used?: number;
  weight_used?: number;
  computed_at: string;
}

export interface PillarScore {
  id: string;
  org_id: string;
  assessment_id: string;
  pillar: Pillar;
  score: number;
  severity: Severity;
  created_at: string;
}

export interface Issue {
  id: string;
  org_id: string;
  assessment_id: string;
  pillar: Pillar;
  theme: string;
  severity: Severity;
  interpretation?: TerritorialInterpretation;
  title: string;
  evidence: {
    indicators: { name: string; score: number }[];
  };
  created_at: string;
}

export interface Course {
  id: string;
  org_id?: string;
  title: string;
  description?: string;
  url?: string;
  duration_minutes?: number;
  level: CourseLevel;
  pillar?: Pillar;
  theme?: string;
  target_agent?: TargetAgent;
  tags: { pillar: Pillar; theme: string }[];
  created_at: string;
}

export interface Recommendation {
  id: string;
  org_id: string;
  assessment_id: string;
  issue_id?: string;
  issue?: Issue;
  course_id?: string;
  course?: Course;
  reason: string;
  priority: number;
  created_at: string;
}

export interface Prescription {
  id: string;
  org_id: string;
  assessment_id: string;
  issue_id?: string;
  issue?: Issue;
  course_id?: string;
  course?: Course;
  indicator_id?: string;
  indicator?: Indicator;
  pillar: Pillar;
  status: Severity;
  interpretation?: TerritorialInterpretation;
  justification: string;
  target_agent: TargetAgent;
  priority: number;
  cycle_number: number;
  created_at: string;
}

export interface PrescriptionCycle {
  id: string;
  org_id: string;
  prescription_id: string;
  assessment_id: string;
  previous_score?: number;
  current_score?: number;
  evolution_state?: EvolutionState;
  created_at: string;
}

// Pillar metadata - SISTUR canonical definitions
export const PILLAR_INFO: Record<Pillar, { name: string; fullName: string; description: string; color: string }> = {
  RA: {
    name: 'I-RA',
    fullName: 'Relações Ambientais',
    description: 'Contexto territorial, sociedade, meio ambiente, dados demográficos e segurança pública',
    color: 'pillar-ra',
  },
  AO: {
    name: 'I-AO',
    fullName: 'Ações Operacionais',
    description: 'Governança pública, planejamento, orçamento e capacidade de tomada de decisão',
    color: 'pillar-ao',
  },
  OE: {
    name: 'I-OE',
    fullName: 'Organização Estrutural',
    description: 'Infraestrutura turística, serviços, mercado, produtos e entrega ao visitante',
    color: 'pillar-oe',
  },
};

// Status labels (Adequado, Atenção, Crítico per spec)
export const SEVERITY_INFO: Record<Severity, { label: string; color: string; bgColor: string }> = {
  CRITICO: { label: 'Crítico', color: 'text-severity-critical', bgColor: 'bg-severity-critical' },
  MODERADO: { label: 'Atenção', color: 'text-severity-moderate', bgColor: 'bg-severity-moderate' },
  BOM: { label: 'Adequado', color: 'text-severity-good', bgColor: 'bg-severity-good' },
};

// Territorial interpretation metadata
export const INTERPRETATION_INFO: Record<TerritorialInterpretation, { label: string; description: string; color: string }> = {
  ESTRUTURAL: {
    label: 'Estrutural',
    description: 'Restrições estruturais, históricas ou socioeconômicas do território',
    color: 'text-blue-600',
  },
  GESTAO: {
    label: 'Gestão',
    description: 'Falhas de governança, planejamento ou coordenação institucional',
    color: 'text-orange-600',
  },
  ENTREGA: {
    label: 'Entrega',
    description: 'Falhas na execução ou prestação de serviços ao turista',
    color: 'text-purple-600',
  },
};

// Target agent metadata
export const TARGET_AGENT_INFO: Record<TargetAgent, { label: string; description: string }> = {
  GESTORES: {
    label: 'Gestores Públicos',
    description: 'Secretários, diretores e gestores de turismo',
  },
  TECNICOS: {
    label: 'Técnicos',
    description: 'Analistas e técnicos de órgãos públicos',
  },
  TRADE: {
    label: 'Trade Turístico',
    description: 'Empresários e prestadores de serviços turísticos',
  },
};

// Evolution state metadata
export const EVOLUTION_INFO: Record<EvolutionState, { label: string; color: string; icon: string }> = {
  EVOLUTION: { label: 'Evolução', color: 'text-green-600', icon: '↑' },
  STAGNATION: { label: 'Estagnação', color: 'text-yellow-600', icon: '→' },
  REGRESSION: { label: 'Regressão', color: 'text-red-600', icon: '↓' },
};
