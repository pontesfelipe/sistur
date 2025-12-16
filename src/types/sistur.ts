// SISTUR Type Definitions

export type Pillar = 'RA' | 'OE' | 'AO';
export type Severity = 'CRITICO' | 'MODERADO' | 'BOM';
export type TerritorialInterpretation = 'ESTRUTURAL' | 'GESTAO' | 'ENTREGA';
export type AssessmentStatus = 'DRAFT' | 'DATA_READY' | 'CALCULATED';
export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER';
export type CourseLevel = 'BASICO' | 'INTERMEDIARIO' | 'AVANCADO';

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

// Pillar metadata
export const PILLAR_INFO: Record<Pillar, { name: string; fullName: string; description: string; color: string }> = {
  RA: {
    name: 'IRA',
    fullName: 'Relações Ambientais',
    description: 'Base do destino: aspectos ecológicos, sociais, culturais, econômicos e político-institucionais',
    color: 'pillar-ra',
  },
  OE: {
    name: 'IOE',
    fullName: 'Organização Estrutural',
    description: 'Estrutura de suporte: infraestrutura, superestrutura e capacidade institucional',
    color: 'pillar-oe',
  },
  AO: {
    name: 'IAO',
    fullName: 'Ações Operacionais',
    description: 'Mercado em ação: oferta, demanda e desempenho de mercado',
    color: 'pillar-ao',
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
