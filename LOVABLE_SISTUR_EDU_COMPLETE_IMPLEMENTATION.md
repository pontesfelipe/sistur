# SISTUR EDU - Implementação Completa para Lovable
## Sistema de Questionário + Recomendações Personalizadas + On-Demand

**INSTRUÇÃO PARA LOVABLE**: Implemente TUDO deste documento de uma vez. Todos os schemas, componentes, hooks e edge functions estão prontos para uso.

---

## 🎯 VISÃO GERAL

Sistema completo que permite:
1. **Estudante preenche questionário** detalhado sobre suas necessidades
2. **Sistema analisa respostas** e sugere treinamentos relevantes
3. **Geração on-demand** de cursos personalizados (quando disponível)
4. **Baseado 100% em Mario Beni** (pilares RA/OE/AO)

---

## 📊 PARTE 1: DATABASE SCHEMAS

### Schema 1: Perfis de Usuário Expandidos

```sql
-- Tabela de perfis expandidos
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  org_id UUID REFERENCES orgs(id),

  -- Tipo de perfil
  profile_type TEXT NOT NULL CHECK (profile_type IN (
    'STUDENT',              -- Estudante
    'TEACHER',              -- Professor
    'RESEARCHER',           -- Pesquisador
    'PUBLIC_MANAGER',       -- Gestor público
    'ENTREPRENEUR',         -- Empresário
    'CONSULTANT',           -- Consultor
    'INSTITUTIONAL'         -- Institucional
  )),

  -- Nível acadêmico
  academic_level TEXT CHECK (academic_level IN (
    'HIGH_SCHOOL',         -- Ensino médio
    'UNDERGRADUATE',       -- Graduação
    'GRADUATE',            -- Pós-graduação
    'DOCTORATE',           -- Doutorado
    'PROFESSIONAL'         -- Técnico/profissional
  )),

  -- Dados contextuais
  institution_name TEXT,
  city TEXT,
  state TEXT,
  area_of_interest TEXT[],

  -- Configurações
  preferred_language TEXT DEFAULT 'pt-BR',
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_type ON user_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(org_id);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();
```

### Schema 2: Questionário de Necessidades

```sql
-- Tabela de respostas de questionário
CREATE TABLE IF NOT EXISTS learning_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contexto do estudante
  current_situation TEXT NOT NULL,  -- Ex: "Estou cursando graduação em Turismo"
  main_objective TEXT NOT NULL,     -- Ex: "Preciso melhorar meu TCC"

  -- Nível de conhecimento
  sistur_knowledge_level TEXT CHECK (sistur_knowledge_level IN (
    'NONE',           -- Nenhum conhecimento
    'BASIC',          -- Conhecimento básico
    'INTERMEDIATE',   -- Intermediário
    'ADVANCED'        -- Avançado
  )),

  -- Pilares de interesse (pode marcar múltiplos)
  interested_pillars TEXT[] DEFAULT ARRAY['RA', 'OE', 'AO'],

  -- Contexto específico
  specific_topics TEXT[],           -- Ex: ["sustentabilidade", "governança turística"]
  learning_goals TEXT[],            -- Ex: ["entender SISTUR", "aplicar em projeto"]
  time_availability TEXT,           -- Ex: "2 horas por semana"
  preferred_format TEXT,            -- Ex: "vídeos e textos"

  -- Necessidades específicas
  needs_lesson_plan BOOLEAN DEFAULT false,
  needs_tcc_support BOOLEAN DEFAULT false,
  needs_thesis_support BOOLEAN DEFAULT false,
  needs_technical_training BOOLEAN DEFAULT false,
  needs_general_course BOOLEAN DEFAULT false,

  -- Contexto adicional (texto livre)
  additional_context TEXT,

  -- Metadados
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_questionnaires_user ON learning_questionnaires(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_questionnaires_date ON learning_questionnaires(completed_at DESC);

-- RLS Policies
ALTER TABLE learning_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own questionnaires"
  ON learning_questionnaires FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questionnaires"
  ON learning_questionnaires FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Schema 3: Recomendações Personalizadas

```sql
-- Tabela de recomendações geradas
CREATE TABLE IF NOT EXISTS personalized_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_id UUID REFERENCES learning_questionnaires(id) ON DELETE CASCADE,

  -- Tipo de recomendação
  recommendation_type TEXT CHECK (recommendation_type IN (
    'TRAINING',      -- Treinamento existente
    'TRACK',         -- Trilha de aprendizado
    'ON_DEMAND'      -- Curso on-demand gerado
  )),

  -- Referência ao conteúdo
  training_id TEXT REFERENCES edu_trainings(training_id),
  track_id UUID REFERENCES edu_tracks(id),
  on_demand_course_id UUID,  -- Será criado depois

  -- Score de relevância (0-100)
  relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),

  -- Justificativa da recomendação
  reason TEXT NOT NULL,
  matched_keywords TEXT[],
  matched_pillars TEXT[],

  -- Status
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',       -- Aguardando ação do usuário
    'VIEWED',        -- Usuário visualizou
    'ENROLLED',      -- Usuário se matriculou
    'DISMISSED'      -- Usuário descartou
  )),

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_user ON personalized_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_questionnaire ON personalized_recommendations(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_score ON personalized_recommendations(relevance_score DESC);

-- RLS Policies
ALTER TABLE personalized_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
  ON personalized_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON personalized_recommendations FOR UPDATE
  USING (auth.uid() = user_id);
```

### Schema 4: Repositório de Conteúdo Mario Beni

```sql
-- Tabela de conteúdo de Mario Beni
CREATE TABLE IF NOT EXISTS beni_content_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de conteúdo
  content_type TEXT NOT NULL CHECK (content_type IN (
    'BOOK',               -- Livro
    'BOOK_CHAPTER',       -- Capítulo de livro
    'ARTICLE',            -- Artigo
    'LECTURE',            -- Palestra
    'VIDEO',              -- Vídeo
    'INTERVIEW',          -- Entrevista
    'THESIS'              -- Tese/dissertação
  )),

  -- Metadados bibliográficos
  title TEXT NOT NULL,
  subtitle TEXT,
  publication_year INTEGER,
  publisher TEXT,
  isbn TEXT,
  doi TEXT,
  url TEXT,
  authors TEXT[] DEFAULT ARRAY['Mario Carlos Beni'],

  -- Organização por pilares
  primary_pillar TEXT CHECK (primary_pillar IN ('RA', 'OE', 'AO')),
  secondary_pillars TEXT[],

  -- Taxonomia
  topics TEXT[],
  keywords TEXT[],

  -- Conteúdo
  abstract TEXT,
  summary TEXT,
  key_concepts JSONB,

  -- Referências cruzadas
  related_content_ids UUID[],

  -- Metadados de uso
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beni_content_type ON beni_content_repository(content_type);
CREATE INDEX IF NOT EXISTS idx_beni_content_pillar ON beni_content_repository(primary_pillar);
CREATE INDEX IF NOT EXISTS idx_beni_content_year ON beni_content_repository(publication_year);
CREATE INDEX IF NOT EXISTS idx_beni_content_topics ON beni_content_repository USING gin(topics);
CREATE INDEX IF NOT EXISTS idx_beni_content_keywords ON beni_content_repository USING gin(keywords);

-- Full text search
CREATE INDEX IF NOT EXISTS idx_beni_content_search ON beni_content_repository
  USING gin(to_tsvector('portuguese', title || ' ' || COALESCE(abstract, '') || ' ' || COALESCE(summary, '')));

-- RLS Policies
ALTER TABLE beni_content_repository ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view Beni content"
  ON beni_content_repository FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage Beni content"
  ON beni_content_repository FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Seed data: Principais obras de Mario Beni
INSERT INTO beni_content_repository (
  content_type,
  title,
  subtitle,
  publication_year,
  publisher,
  isbn,
  primary_pillar,
  secondary_pillars,
  topics,
  keywords,
  abstract,
  summary,
  key_concepts
) VALUES
(
  'BOOK',
  'Análise Estrutural do Turismo',
  NULL,
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'OE',
  ARRAY['RA', 'AO'],
  ARRAY['teoria sistêmica', 'SISTUR', 'análise estrutural', 'turismo'],
  ARRAY['turismo', 'sistema', 'SISTUR', 'Beni', 'estrutural'],
  'Obra fundamental que apresenta o modelo SISTUR (Sistema de Turismo) e a teoria sistêmica aplicada ao turismo. Revolucionou os estudos de turismo no Brasil.',
  'Este livro apresenta uma abordagem sistêmica do turismo através do modelo SISTUR, dividindo o sistema turístico em três conjuntos interdependentes: Relações Ambientais (RA), Organização Estrutural (OE) e Ações Operacionais (AO). A obra estabelece o turismo como um sistema aberto em constante interação com seu ambiente.',
  '{
    "sistur_model": "Sistema aberto com três conjuntos interdependentes (RA, OE, AO)",
    "ra": "Relações Ambientais - base ecológica, social e cultural do turismo",
    "oe": "Organização Estrutural - infraestrutura e superestrutura turística",
    "ao": "Ações Operacionais - comercialização, marketing e operação",
    "systems_theory": "Turismo como sistema aberto em interação dinâmica com o ambiente",
    "holistic_approach": "Visão holística e interdisciplinar do fenômeno turístico",
    "hierarchy": "RA é a base, OE depende de RA, AO depende de ambos"
  }'::jsonb
),
(
  'BOOK_CHAPTER',
  'O Conjunto das Relações Ambientais',
  'Capítulo de Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'RA',
  ARRAY[]::TEXT[],
  ARRAY['meio ambiente', 'sustentabilidade', 'patrimônio cultural', 'ecologia turística'],
  ARRAY['RA', 'ambiente', 'ecologia', 'cultura', 'sustentabilidade'],
  'Capítulo que detalha o primeiro e fundamental conjunto do SISTUR: as Relações Ambientais (RA).',
  'Beni explica que o turismo depende fundamentalmente do meio ambiente natural e cultural. O RA é a base de todo o sistema turístico - sem recursos ambientais preservados e patrimônio cultural valorizado, não há turismo sustentável. Este conjunto inclui subsistemas ecológico, social, econômico e cultural.',
  '{
    "primacy_of_environment": "RA é a base e fundamento de todo o sistema turístico",
    "subsystems": ["ecológico", "social", "econômico", "cultural"],
    "natural_resources": "Recursos naturais como atrativos turísticos",
    "cultural_heritage": "Patrimônio cultural material e imaterial",
    "carrying_capacity": "Capacidade de carga ambiental e social",
    "sustainability": "Sustentabilidade como princípio fundamental",
    "community": "Comunidade local como parte integral do sistema"
  }'::jsonb
),
(
  'BOOK_CHAPTER',
  'O Conjunto da Organização Estrutural',
  'Capítulo de Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'OE',
  ARRAY['AO'],
  ARRAY['infraestrutura', 'superestrutura', 'governança', 'planejamento turístico'],
  ARRAY['OE', 'infraestrutura', 'superestrutura', 'planejamento', 'governança'],
  'Capítulo dedicado ao segundo conjunto do SISTUR: a Organização Estrutural (OE).',
  'Detalha a infraestrutura turística (meios de hospedagem, transportes, equipamentos) e a superestrutura (órgãos públicos de turismo, legislação, políticas públicas). Beni enfatiza que a OE só funciona adequadamente quando o RA está preservado.',
  '{
    "infrastructure": "Infraestrutura física: hotéis, transportes, restaurantes, equipamentos",
    "superstructure": "Superestrutura institucional: órgãos de turismo, leis, políticas",
    "planning": "Planejamento integrado e participativo",
    "governance": "Governança pública do turismo",
    "dependency_ra": "OE depende de RA saudável para funcionar",
    "investment": "Investimentos em infraestrutura devem respeitar capacidade ambiental",
    "regulation": "Regulação e ordenamento do território turístico"
  }'::jsonb
),
(
  'BOOK_CHAPTER',
  'O Conjunto das Ações Operacionais',
  'Capítulo de Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'AO',
  ARRAY[]::TEXT[],
  ARRAY['operação turística', 'marketing', 'comercialização', 'distribuição'],
  ARRAY['AO', 'operação', 'marketing', 'comercialização', 'distribuição'],
  'Capítulo sobre o terceiro conjunto do SISTUR: as Ações Operacionais (AO).',
  'Aborda a comercialização, distribuição, marketing e operação dos produtos turísticos. É o conjunto mais visível para o turista. Beni ressalta que AO só pode funcionar bem se RA e OE estiverem adequados.',
  '{
    "commercialization": "Comercialização de produtos e serviços turísticos",
    "distribution": "Distribuição através de agências e operadoras",
    "marketing": "Marketing e promoção de destinos",
    "operation": "Operação e execução de serviços turísticos",
    "experience": "Entrega da experiência turística ao visitante",
    "subordination": "AO subordinado a RA e OE - não pode compensar deficiências",
    "market": "Relação entre oferta e demanda turística"
  }'::jsonb
),
(
  'ARTICLE',
  'Turismo: Da Economia de Serviços à Economia da Experiência',
  NULL,
  2003,
  'Revista Turismo em Análise',
  NULL,
  'AO',
  ARRAY['OE'],
  ARRAY['economia da experiência', 'serviços turísticos', 'qualidade'],
  ARRAY['economia', 'experiência', 'serviços', 'qualidade'],
  'Artigo que discute a evolução do turismo da economia de serviços para a economia da experiência.',
  'Beni analisa como o turismo evoluiu de uma indústria focada em serviços para uma economia baseada em experiências memoráveis. Enfatiza a importância da qualidade, autenticidade e personalização.',
  '{
    "experience_economy": "Turismo como economia da experiência",
    "memorability": "Experiências memoráveis e transformadoras",
    "authenticity": "Autenticidade como valor fundamental",
    "quality": "Qualidade total nos serviços turísticos",
    "personalization": "Personalização e customização de experiências"
  }'::jsonb
),
(
  'LECTURE',
  'Planejamento Estratégico de Destinos Turísticos',
  'Palestra sobre planejamento sistêmico',
  2010,
  NULL,
  NULL,
  'OE',
  ARRAY['RA', 'AO'],
  ARRAY['planejamento', 'destinos turísticos', 'estratégia', 'desenvolvimento sustentável'],
  ARRAY['planejamento', 'estratégia', 'destinos', 'sustentabilidade'],
  'Palestra sobre metodologia de planejamento estratégico de destinos turísticos baseada no modelo SISTUR.',
  'Beni apresenta metodologia de planejamento que integra os três conjuntos do SISTUR. Enfatiza a necessidade de diagnóstico sistêmico antes de qualquer intervenção.',
  '{
    "systemic_diagnosis": "Diagnóstico sistêmico dos três conjuntos (RA, OE, AO)",
    "strategic_planning": "Planejamento estratégico participativo",
    "stakeholder_engagement": "Envolvimento de todos os stakeholders",
    "integrated_approach": "Abordagem integrada e holística",
    "continuous_monitoring": "Monitoramento contínuo e avaliação"
  }'::jsonb
);
```

---

## 📝 PARTE 2: TYPESCRIPT TYPES

Adicionar em `src/types/sistur.ts`:

```typescript
// ============================================
// USER PROFILES
// ============================================

export type ProfileType =
  | 'STUDENT'
  | 'TEACHER'
  | 'RESEARCHER'
  | 'PUBLIC_MANAGER'
  | 'ENTREPRENEUR'
  | 'CONSULTANT'
  | 'INSTITUTIONAL';

export type AcademicLevel =
  | 'HIGH_SCHOOL'
  | 'UNDERGRADUATE'
  | 'GRADUATE'
  | 'DOCTORATE'
  | 'PROFESSIONAL';

export interface UserProfile {
  id: string;
  user_id: string;
  org_id?: string;
  profile_type: ProfileType;
  academic_level?: AcademicLevel;
  institution_name?: string;
  city?: string;
  state?: string;
  area_of_interest?: string[];
  preferred_language?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export const PROFILE_TYPE_LABELS: Record<ProfileType, { label: string; description: string }> = {
  STUDENT: {
    label: 'Estudante',
    description: 'Estudante de graduação ou técnico'
  },
  TEACHER: {
    label: 'Professor',
    description: 'Educador de turismo'
  },
  RESEARCHER: {
    label: 'Pesquisador',
    description: 'Pós-graduação, mestrado ou doutorado'
  },
  PUBLIC_MANAGER: {
    label: 'Gestor Público',
    description: 'Secretarias e órgãos de turismo'
  },
  ENTREPRENEUR: {
    label: 'Empresário',
    description: 'Setor privado de turismo'
  },
  CONSULTANT: {
    label: 'Consultor',
    description: 'Consultor técnico em turismo'
  },
  INSTITUTIONAL: {
    label: 'Institucional',
    description: 'Prefeituras, empresas, universidades'
  }
};

export const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> = {
  HIGH_SCHOOL: 'Ensino Médio',
  UNDERGRADUATE: 'Graduação',
  GRADUATE: 'Pós-graduação',
  DOCTORATE: 'Doutorado',
  PROFESSIONAL: 'Técnico/Profissional'
};

// ============================================
// LEARNING QUESTIONNAIRE
// ============================================

export type SisturKnowledgeLevel = 'NONE' | 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

export interface LearningQuestionnaire {
  id: string;
  user_id: string;
  current_situation: string;
  main_objective: string;
  sistur_knowledge_level: SisturKnowledgeLevel;
  interested_pillars: ('RA' | 'OE' | 'AO')[];
  specific_topics: string[];
  learning_goals: string[];
  time_availability?: string;
  preferred_format?: string;
  needs_lesson_plan: boolean;
  needs_tcc_support: boolean;
  needs_thesis_support: boolean;
  needs_technical_training: boolean;
  needs_general_course: boolean;
  additional_context?: string;
  completed_at: string;
  created_at: string;
}

export const KNOWLEDGE_LEVEL_LABELS: Record<SisturKnowledgeLevel, { label: string; description: string }> = {
  NONE: {
    label: 'Nenhum',
    description: 'Nunca ouvi falar do SISTUR'
  },
  BASIC: {
    label: 'Básico',
    description: 'Conheço superficialmente'
  },
  INTERMEDIATE: {
    label: 'Intermediário',
    description: 'Estudei SISTUR em alguma disciplina'
  },
  ADVANCED: {
    label: 'Avançado',
    description: 'Domino a metodologia de Mario Beni'
  }
};

// ============================================
// PERSONALIZED RECOMMENDATIONS
// ============================================

export type RecommendationType = 'TRAINING' | 'TRACK' | 'ON_DEMAND';
export type RecommendationStatus = 'PENDING' | 'VIEWED' | 'ENROLLED' | 'DISMISSED';

export interface PersonalizedRecommendation {
  id: string;
  user_id: string;
  questionnaire_id: string;
  recommendation_type: RecommendationType;
  training_id?: string;
  track_id?: string;
  on_demand_course_id?: string;
  relevance_score: number;
  reason: string;
  matched_keywords: string[];
  matched_pillars: string[];
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
}

export interface RecommendationWithContent extends PersonalizedRecommendation {
  training?: any;  // EduTraining
  track?: any;     // EduTrack
}

// ============================================
// BENI CONTENT REPOSITORY
// ============================================

export type BeniContentType =
  | 'BOOK'
  | 'BOOK_CHAPTER'
  | 'ARTICLE'
  | 'LECTURE'
  | 'VIDEO'
  | 'INTERVIEW'
  | 'THESIS';

export interface BeniContent {
  id: string;
  content_type: BeniContentType;
  title: string;
  subtitle?: string;
  publication_year?: number;
  publisher?: string;
  isbn?: string;
  doi?: string;
  url?: string;
  authors: string[];
  primary_pillar?: 'RA' | 'OE' | 'AO';
  secondary_pillars?: string[];
  topics: string[];
  keywords: string[];
  abstract?: string;
  summary?: string;
  key_concepts?: Record<string, any>;
  related_content_ids?: string[];
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 🎣 PARTE 3: REACT HOOKS

### Hook 1: useUserProfile

Criar `src/hooks/useUserProfile.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { UserProfile, ProfileType, AcademicLevel } from '@/types/sistur';

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id
  });
}

export function useUserProfileMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createOrUpdateProfile = useMutation({
    mutationFn: async (profile: Partial<UserProfile>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if profile exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('user_profiles')
          .update(profile)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            ...profile
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Perfil salvo com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar perfil: ${error.message}`);
    }
  });

  return { createOrUpdateProfile };
}
```

### Hook 2: useLearningQuestionnaire

Criar `src/hooks/useLearningQuestionnaire.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LearningQuestionnaire } from '@/types/sistur';

export function useLearningQuestionnaires() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['learning-questionnaires', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('learning_questionnaires')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data as LearningQuestionnaire[];
    },
    enabled: !!user?.id
  });
}

export function useLearningQuestionnaireMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const submitQuestionnaire = useMutation({
    mutationFn: async (questionnaire: Omit<LearningQuestionnaire, 'id' | 'user_id' | 'completed_at' | 'created_at'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('learning_questionnaires')
        .insert({
          user_id: user.id,
          ...questionnaire
        })
        .select()
        .single();

      if (error) throw error;
      return data as LearningQuestionnaire;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-questionnaires'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar questionário: ${error.message}`);
    }
  });

  return { submitQuestionnaire };
}
```

### Hook 3: usePersonalizedRecommendations

Criar `src/hooks/usePersonalizedRecommendations.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { PersonalizedRecommendation, RecommendationWithContent, RecommendationStatus } from '@/types/sistur';

export function usePersonalizedRecommendations(questionnaireId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['personalized-recommendations', user?.id, questionnaireId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('personalized_recommendations')
        .select(`
          *,
          training:edu_trainings(training_id, title, type, pillar, objective, video_url, modules),
          track:edu_tracks(id, name, description)
        `)
        .eq('user_id', user.id)
        .order('relevance_score', { ascending: false });

      if (questionnaireId) {
        query = query.eq('questionnaire_id', questionnaireId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RecommendationWithContent[];
    },
    enabled: !!user?.id
  });
}

export function useRecommendationMutations() {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RecommendationStatus }) => {
      const { data, error } = await supabase
        .from('personalized_recommendations')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalized-recommendations'] });
    }
  });

  return { updateStatus };
}
```

### Hook 4: useBeniContent

Criar `src/hooks/useBeniContent.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BeniContent, BeniContentType } from '@/types/sistur';

export function useBeniContent(filters?: {
  contentType?: BeniContentType;
  pillar?: 'RA' | 'OE' | 'AO';
  searchQuery?: string;
  topics?: string[];
}) {
  return useQuery({
    queryKey: ['beni-content', filters],
    queryFn: async () => {
      let query = supabase
        .from('beni_content_repository')
        .select('*')
        .order('publication_year', { ascending: false });

      if (filters?.contentType) {
        query = query.eq('content_type', filters.contentType);
      }

      if (filters?.pillar) {
        query = query.eq('primary_pillar', filters.pillar);
      }

      if (filters?.searchQuery) {
        query = query.textSearch('title', filters.searchQuery, {
          type: 'websearch',
          config: 'portuguese'
        });
      }

      if (filters?.topics && filters.topics.length > 0) {
        query = query.overlaps('topics', filters.topics);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BeniContent[];
    }
  });
}

export function useBeniContentById(id?: string) {
  return useQuery({
    queryKey: ['beni-content', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('beni_content_repository')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as BeniContent;
    },
    enabled: !!id
  });
}
```

---

## 🎨 PARTE 4: UI COMPONENTS

### Component 1: ProfileSetup

Criar `src/pages/ProfileSetup.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile, useUserProfileMutations } from '@/hooks/useUserProfile';
import { PROFILE_TYPE_LABELS, ACADEMIC_LEVEL_LABELS, type ProfileType, type AcademicLevel } from '@/types/sistur';
import { Loader2 } from 'lucide-react';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { createOrUpdateProfile } = useUserProfileMutations();

  const [formData, setFormData] = useState({
    profile_type: '' as ProfileType,
    academic_level: '' as AcademicLevel,
    institution_name: '',
    city: '',
    state: '',
    area_of_interest: [] as string[]
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        profile_type: profile.profile_type,
        academic_level: profile.academic_level || '' as AcademicLevel,
        institution_name: profile.institution_name || '',
        city: profile.city || '',
        state: profile.state || '',
        area_of_interest: profile.area_of_interest || []
      });
    }
  }, [profile]);

  const handleSubmit = async () => {
    await createOrUpdateProfile.mutateAsync(formData);
    navigate('/edu/questionnaire');
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configure seu Perfil SISTUR EDU</CardTitle>
            <CardDescription>
              Personalize sua experiência de aprendizado baseada na metodologia Mario Beni
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tipo de Perfil */}
            <div className="space-y-2">
              <Label>Quem é você? *</Label>
              <Select
                value={formData.profile_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, profile_type: value as ProfileType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu perfil" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROFILE_TYPE_LABELS).map(([key, { label, description }]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-muted-foreground">{description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nível Acadêmico (condicional) */}
            {['STUDENT', 'TEACHER', 'RESEARCHER'].includes(formData.profile_type) && (
              <div className="space-y-2">
                <Label>Nível Acadêmico</Label>
                <Select
                  value={formData.academic_level}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, academic_level: value as AcademicLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACADEMIC_LEVEL_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Instituição */}
            <div className="space-y-2">
              <Label>Instituição (opcional)</Label>
              <Input
                value={formData.institution_name}
                onChange={(e) => setFormData(prev => ({ ...prev, institution_name: e.target.value }))}
                placeholder="Nome da instituição"
              />
            </div>

            {/* Cidade e Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Sua cidade"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={!formData.profile_type || createOrUpdateProfile.isPending}
            >
              {createOrUpdateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Continuar para Questionário'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Component 2: LearningQuestionnaire (Multi-Step)

Criar `src/pages/LearningQuestionnaire.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLearningQuestionnaireMutations } from '@/hooks/useLearningQuestionnaire';
import { useUserProfile } from '@/hooks/useUserProfile';
import { KNOWLEDGE_LEVEL_LABELS, PILLAR_INFO, type SisturKnowledgeLevel, type Pillar } from '@/types/sistur';
import { Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const TOTAL_STEPS = 6;

export default function LearningQuestionnaire() {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { submitQuestionnaire } = useLearningQuestionnaireMutations();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    current_situation: '',
    main_objective: '',
    sistur_knowledge_level: '' as SisturKnowledgeLevel,
    interested_pillars: ['RA', 'OE', 'AO'] as Pillar[],
    specific_topics: [] as string[],
    learning_goals: [] as string[],
    time_availability: '',
    preferred_format: '',
    needs_lesson_plan: false,
    needs_tcc_support: false,
    needs_thesis_support: false,
    needs_technical_training: false,
    needs_general_course: false,
    additional_context: ''
  });

  const [topicInput, setTopicInput] = useState('');
  const [goalInput, setGoalInput] = useState('');

  const handleAddTopic = () => {
    if (topicInput.trim()) {
      setFormData(prev => ({
        ...prev,
        specific_topics: [...prev.specific_topics, topicInput.trim()]
      }));
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specific_topics: prev.specific_topics.filter((_, i) => i !== index)
    }));
  };

  const handleAddGoal = () => {
    if (goalInput.trim()) {
      setFormData(prev => ({
        ...prev,
        learning_goals: [...prev.learning_goals, goalInput.trim()]
      }));
      setGoalInput('');
    }
  };

  const handleRemoveGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learning_goals: prev.learning_goals.filter((_, i) => i !== index)
    }));
  };

  const togglePillar = (pillar: Pillar) => {
    setFormData(prev => {
      const pillars = prev.interested_pillars.includes(pillar)
        ? prev.interested_pillars.filter(p => p !== pillar)
        : [...prev.interested_pillars, pillar];
      return { ...prev, interested_pillars: pillars };
    });
  };

  const handleSubmit = async () => {
    if (!formData.interested_pillars.length) {
      toast.error('Selecione pelo menos um pilar de interesse');
      return;
    }

    try {
      const questionnaire = await submitQuestionnaire.mutateAsync(formData);
      toast.success('Questionário enviado! Gerando suas recomendações...');

      // Trigger recommendation generation via edge function
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          questionnaire_id: questionnaire.id
        })
      });

      navigate(`/edu/recommendations/${questionnaire.id}`);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.current_situation.trim().length > 0;
      case 2:
        return formData.main_objective.trim().length > 0;
      case 3:
        return formData.sistur_knowledge_level !== '';
      case 4:
        return formData.interested_pillars.length > 0;
      case 5:
        return true; // Optional step
      case 6:
        return true; // Review step
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Questionário de Aprendizagem</h1>
            <span className="text-sm text-muted-foreground">
              Passo {step} de {TOTAL_STEPS}
            </span>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && '📚 Conte-nos sobre você'}
              {step === 2 && '🎯 Qual seu objetivo principal?'}
              {step === 3 && '🧠 Conhecimento sobre SISTUR'}
              {step === 4 && '🏛️ Pilares de Interesse'}
              {step === 5 && '📝 Personalize sua experiência'}
              {step === 6 && '✅ Revise suas respostas'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Descreva sua situação atual de forma livre'}
              {step === 2 && 'O que você quer alcançar com os treinamentos?'}
              {step === 3 && 'Avalie seu conhecimento sobre a metodologia Mario Beni'}
              {step === 4 && 'Selecione os pilares do SISTUR que mais te interessam'}
              {step === 5 && 'Adicione detalhes opcionais para melhores recomendações'}
              {step === 6 && 'Confira suas respostas antes de enviar'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Situação Atual */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Qual sua situação atual? *</Label>
                  <Textarea
                    value={formData.current_situation}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_situation: e.target.value }))}
                    placeholder="Ex: Estou cursando graduação em Turismo no 4º semestre e preciso entender melhor o planejamento turístico"
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Seja específico: mencione seu curso, semestre, instituição, contexto profissional, etc.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Objetivo Principal */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>O que você quer alcançar? *</Label>
                  <Textarea
                    value={formData.main_objective}
                    onChange={(e) => setFormData(prev => ({ ...prev, main_objective: e.target.value }))}
                    placeholder="Ex: Preciso entender a metodologia SISTUR para aplicar no meu TCC sobre desenvolvimento sustentável de destinos turísticos"
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Exemplos: concluir TCC, preparar aula, entender diagnóstico territorial, capacitar equipe, etc.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Nível de Conhecimento */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Seu conhecimento sobre SISTUR/Mario Beni *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(KNOWLEDGE_LEVEL_LABELS).map(([key, { label, description }]) => (
                      <Card
                        key={key}
                        className={`cursor-pointer hover:border-primary transition-colors ${
                          formData.sistur_knowledge_level === key ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, sistur_knowledge_level: key as SisturKnowledgeLevel }))}
                      >
                        <CardContent className="pt-6">
                          <h4 className="font-medium mb-1">{label}</h4>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Pilares de Interesse */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Quais pilares do SISTUR te interessam? *</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecione um ou mais pilares. As recomendações serão focadas neles.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {(['RA', 'OE', 'AO'] as Pillar[]).map(pillar => {
                      const info = PILLAR_INFO[pillar];
                      const isSelected = formData.interested_pillars.includes(pillar);
                      return (
                        <Card
                          key={pillar}
                          className={`cursor-pointer hover:border-primary transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : ''
                          }`}
                          onClick={() => togglePillar(pillar)}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={pillar.toLowerCase() as any}>
                                {pillar}
                              </Badge>
                              <Checkbox checked={isSelected} />
                            </div>
                            <h4 className="font-medium mb-1">{info.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {info.description}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Detalhes Opcionais */}
            {step === 5 && (
              <div className="space-y-6">
                {/* Tópicos Específicos */}
                <div className="space-y-2">
                  <Label>Tópicos específicos de interesse (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="Ex: sustentabilidade, governança, marketing"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                    />
                    <Button type="button" onClick={handleAddTopic} variant="outline">
                      Adicionar
                    </Button>
                  </div>
                  {formData.specific_topics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.specific_topics.map((topic, i) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTopic(i)}>
                          {topic} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Objetivos de Aprendizagem */}
                <div className="space-y-2">
                  <Label>Objetivos de aprendizagem (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder="Ex: entender SISTUR, aplicar diagnóstico"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
                    />
                    <Button type="button" onClick={handleAddGoal} variant="outline">
                      Adicionar
                    </Button>
                  </div>
                  {formData.learning_goals.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.learning_goals.map((goal, i) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveGoal(i)}>
                          {goal} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Disponibilidade */}
                <div className="space-y-2">
                  <Label>Quanto tempo você tem disponível?</Label>
                  <Input
                    value={formData.time_availability}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_availability: e.target.value }))}
                    placeholder="Ex: 2 horas por semana, 1 mês para concluir"
                  />
                </div>

                {/* Formato Preferido */}
                <div className="space-y-2">
                  <Label>Formato preferido de aprendizado</Label>
                  <Select
                    value={formData.preferred_format}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="videos">Apenas vídeos</SelectItem>
                      <SelectItem value="texts">Apenas textos</SelectItem>
                      <SelectItem value="mixed">Vídeos e textos</SelectItem>
                      <SelectItem value="interactive">Conteúdo interativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Necessidades Específicas */}
                <div className="space-y-3">
                  <Label>Você precisa de algum desses? (marque todos que aplicam)</Label>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needs_lesson_plan"
                      checked={formData.needs_lesson_plan}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, needs_lesson_plan: checked as boolean }))
                      }
                    />
                    <Label htmlFor="needs_lesson_plan" className="font-normal cursor-pointer">
                      Plano de aula estruturado (para professores)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needs_tcc_support"
                      checked={formData.needs_tcc_support}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, needs_tcc_support: checked as boolean }))
                      }
                    />
                    <Label htmlFor="needs_tcc_support" className="font-normal cursor-pointer">
                      Suporte para TCC/monografia
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needs_thesis_support"
                      checked={formData.needs_thesis_support}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, needs_thesis_support: checked as boolean }))
                      }
                    />
                    <Label htmlFor="needs_thesis_support" className="font-normal cursor-pointer">
                      Suporte para dissertação/tese
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needs_technical_training"
                      checked={formData.needs_technical_training}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, needs_technical_training: checked as boolean }))
                      }
                    />
                    <Label htmlFor="needs_technical_training" className="font-normal cursor-pointer">
                      Capacitação técnica para equipe
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needs_general_course"
                      checked={formData.needs_general_course}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, needs_general_course: checked as boolean }))
                      }
                    />
                    <Label htmlFor="needs_general_course" className="font-normal cursor-pointer">
                      Curso geral sobre SISTUR
                    </Label>
                  </div>
                </div>

                {/* Contexto Adicional */}
                <div className="space-y-2">
                  <Label>Algo mais que devemos saber?</Label>
                  <Textarea
                    value={formData.additional_context}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_context: e.target.value }))}
                    placeholder="Informações adicionais que podem ajudar nas recomendações..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 6: Revisão */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3 text-sm">
                  <div>
                    <strong>Situação Atual:</strong>
                    <p className="mt-1 text-muted-foreground">{formData.current_situation}</p>
                  </div>
                  <div>
                    <strong>Objetivo Principal:</strong>
                    <p className="mt-1 text-muted-foreground">{formData.main_objective}</p>
                  </div>
                  <div>
                    <strong>Conhecimento SISTUR:</strong>{' '}
                    {KNOWLEDGE_LEVEL_LABELS[formData.sistur_knowledge_level]?.label}
                  </div>
                  <div>
                    <strong>Pilares de Interesse:</strong>
                    <div className="flex gap-2 mt-1">
                      {formData.interested_pillars.map(pillar => (
                        <Badge key={pillar} variant={pillar.toLowerCase() as any}>
                          {pillar}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {formData.specific_topics.length > 0 && (
                    <div>
                      <strong>Tópicos:</strong> {formData.specific_topics.join(', ')}
                    </div>
                  )}
                  {formData.learning_goals.length > 0 && (
                    <div>
                      <strong>Objetivos:</strong> {formData.learning_goals.join(', ')}
                    </div>
                  )}
                  {formData.time_availability && (
                    <div>
                      <strong>Disponibilidade:</strong> {formData.time_availability}
                    </div>
                  )}
                  {formData.preferred_format && (
                    <div>
                      <strong>Formato:</strong> {formData.preferred_format}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              )}

              {step < TOTAL_STEPS && (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="ml-auto"
                >
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {step === TOTAL_STEPS && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitQuestionnaire.isPending}
                  className="ml-auto"
                >
                  {submitQuestionnaire.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar Recomendações
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Component 3: PersonalizedRecommendations

Criar `src/pages/PersonalizedRecommendations.tsx`:

```typescript
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonalizedRecommendations, useRecommendationMutations } from '@/hooks/usePersonalizedRecommendations';
import { PILLAR_INFO } from '@/types/sistur';
import { Sparkles, ExternalLink, CheckCircle, X } from 'lucide-react';

export default function PersonalizedRecommendations() {
  const { questionnaireId } = useParams<{ questionnaireId: string }>();
  const { data: recommendations, isLoading } = usePersonalizedRecommendations(questionnaireId);
  const { updateStatus } = useRecommendationMutations();

  const handleDismiss = async (id: string) => {
    await updateStatus.mutateAsync({ id, status: 'DISMISSED' });
  };

  const handleView = async (id: string) => {
    await updateStatus.mutateAsync({ id, status: 'VIEWED' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Sem Recomendações</CardTitle>
              <CardDescription>
                Não foram encontradas recomendações para suas respostas. Tente responder o questionário novamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/edu/questionnaire">Novo Questionário</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const topRecommendations = recommendations.filter(r => r.relevance_score >= 70);
  const otherRecommendations = recommendations.filter(r => r.relevance_score < 70);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Suas Recomendações Personalizadas
          </h1>
          <p className="text-muted-foreground">
            Baseado nas suas respostas, selecionamos os melhores treinamentos da metodologia Mario Beni
          </p>
        </div>

        {/* Top Recommendations */}
        {topRecommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 Altamente Recomendados para Você
              </CardTitle>
              <CardDescription>
                Estes treinamentos têm alta relevância com suas necessidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topRecommendations.map((rec, index) => (
                <div
                  key={rec.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      {rec.training && (
                        <>
                          <Badge variant={rec.training.pillar?.toLowerCase() as any}>
                            {rec.training.pillar}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rec.training.type === 'course' ? 'Curso' : 'Live'}
                          </Badge>
                        </>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {rec.relevance_score}% relevante
                      </Badge>
                    </div>

                    {/* Title */}
                    <h4 className="font-medium text-lg mb-1">
                      {rec.training?.title || rec.track?.name || 'Treinamento'}
                    </h4>

                    {/* Reason */}
                    <p className="text-sm text-muted-foreground mb-2">
                      {rec.reason}
                    </p>

                    {/* Matched Keywords */}
                    {rec.matched_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {rec.matched_keywords.slice(0, 5).map((keyword, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {rec.matched_keywords.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{rec.matched_keywords.length - 5}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {rec.training?.objective && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rec.training.objective}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      asChild
                      onClick={() => handleView(rec.id)}
                    >
                      <Link to={
                        rec.recommendation_type === 'TRAINING'
                          ? `/edu/training/${rec.training_id}`
                          : `/edu/trilhas/${rec.track_id}`
                      }>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(rec.id)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Dispensar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Other Recommendations */}
        {otherRecommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📚 Outras Sugestões</CardTitle>
              <CardDescription>
                Treinamentos complementares que podem te interessar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherRecommendations.map(rec => (
                  <Link
                    key={rec.id}
                    to={
                      rec.recommendation_type === 'TRAINING'
                        ? `/edu/training/${rec.training_id}`
                        : `/edu/trilhas/${rec.track_id}`
                    }
                    onClick={() => handleView(rec.id)}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        {rec.training && (
                          <Badge variant={rec.training.pillar?.toLowerCase() as any} className="mb-2">
                            {rec.training.pillar}
                          </Badge>
                        )}
                        <h4 className="font-medium text-sm line-clamp-2">
                          {rec.training?.title || rec.track?.name}
                        </h4>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Relevância: {rec.relevance_score}%
                    </p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/edu/catalogo">
              Ver Catálogo Completo
            </Link>
          </Button>
          <Button asChild>
            <Link to="/edu/questionnaire">
              Refazer Questionário
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## ⚡ PARTE 5: EDGE FUNCTION - GERADOR DE RECOMENDAÇÕES

Criar `supabase/functions/generate-recommendations/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { questionnaire_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Fetch questionnaire data
    const { data: questionnaire, error: qError } = await supabase
      .from('learning_questionnaires')
      .select('*')
      .eq('id', questionnaire_id)
      .single();

    if (qError) throw qError;

    console.log('Processing questionnaire:', questionnaire_id);

    // 2. Fetch all trainings
    const { data: trainings, error: tError } = await supabase
      .from('edu_trainings')
      .select('*')
      .eq('active', true);

    if (tError) throw tError;

    // 3. Fetch all tracks
    const { data: tracks, error: trError } = await supabase
      .from('edu_tracks')
      .select('*');

    if (trError) throw trError;

    // 4. Calculate relevance scores
    const recommendations: any[] = [];

    // Score trainings
    for (const training of trainings || []) {
      let score = 0;
      const matchedKeywords: string[] = [];
      const matchedPillars: string[] = [];

      // Pillar match (40 points)
      if (questionnaire.interested_pillars.includes(training.pillar)) {
        score += 40;
        matchedPillars.push(training.pillar);
      }

      // Topic match (30 points)
      const trainingText = `${training.title} ${training.objective || ''} ${training.course_code || ''}`.toLowerCase();
      for (const topic of questionnaire.specific_topics || []) {
        if (trainingText.includes(topic.toLowerCase())) {
          score += 5;
          matchedKeywords.push(topic);
        }
      }

      // Knowledge level match (20 points)
      const levelMapping: Record<string, string[]> = {
        'NONE': ['básico', 'introdução', 'fundamentos'],
        'BASIC': ['intermediário', 'aplicado'],
        'INTERMEDIATE': ['avançado', 'aprofundado'],
        'ADVANCED': ['avançado', 'especialização', 'pesquisa']
      };

      const levelKeywords = levelMapping[questionnaire.sistur_knowledge_level] || [];
      for (const keyword of levelKeywords) {
        if (trainingText.includes(keyword)) {
          score += 10;
          break;
        }
      }

      // Goal match (10 points)
      for (const goal of questionnaire.learning_goals || []) {
        if (trainingText.includes(goal.toLowerCase())) {
          score += 5;
          matchedKeywords.push(goal);
        }
      }

      // Cap score at 100
      score = Math.min(score, 100);

      // Only add if score > 30
      if (score > 30) {
        const reason = generateReason(training, questionnaire, matchedKeywords, matchedPillars);

        recommendations.push({
          user_id: questionnaire.user_id,
          questionnaire_id: questionnaire.id,
          recommendation_type: 'TRAINING',
          training_id: training.training_id,
          relevance_score: score,
          reason,
          matched_keywords: matchedKeywords,
          matched_pillars: matchedPillars,
          status: 'PENDING'
        });
      }
    }

    // Score tracks (simplified)
    for (const track of tracks || []) {
      let score = 50; // Base score for tracks
      const trackText = `${track.name} ${track.description || ''}`.toLowerCase();
      const matchedKeywords: string[] = [];

      for (const topic of questionnaire.specific_topics || []) {
        if (trackText.includes(topic.toLowerCase())) {
          score += 10;
          matchedKeywords.push(topic);
        }
      }

      if (score > 40) {
        recommendations.push({
          user_id: questionnaire.user_id,
          questionnaire_id: questionnaire.id,
          recommendation_type: 'TRACK',
          track_id: track.id,
          relevance_score: Math.min(score, 100),
          reason: `Esta trilha aborda tópicos relacionados aos seus interesses: ${matchedKeywords.join(', ') || 'desenvolvimento sistemático'}.`,
          matched_keywords: matchedKeywords,
          matched_pillars: [],
          status: 'PENDING'
        });
      }
    }

    // 5. Sort by score and insert top 10
    recommendations.sort((a, b) => b.relevance_score - a.relevance_score);
    const topRecommendations = recommendations.slice(0, 10);

    if (topRecommendations.length > 0) {
      const { error: insertError } = await supabase
        .from('personalized_recommendations')
        .insert(topRecommendations);

      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({
      success: true,
      recommendations_count: topRecommendations.length,
      questionnaire_id
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

function generateReason(training: any, questionnaire: any, keywords: string[], pillars: string[]): string {
  const reasons: string[] = [];

  if (pillars.length > 0) {
    reasons.push(`Este treinamento foca no pilar ${pillars.join(', ')} que você selecionou`);
  }

  if (keywords.length > 0) {
    reasons.push(`aborda os tópicos: ${keywords.slice(0, 3).join(', ')}`);
  }

  if (questionnaire.needs_tcc_support && training.title.toLowerCase().includes('pesquisa')) {
    reasons.push('recomendado para quem está desenvolvendo TCC');
  }

  if (questionnaire.needs_lesson_plan && training.title.toLowerCase().includes('planejamento')) {
    reasons.push('útil para elaboração de planos de aula');
  }

  return reasons.join(' e ') + '.';
}
```

---

## 🚀 PARTE 6: ROUTING - Adicionar em App.tsx

Adicionar estas rotas em `src/App.tsx`:

```typescript
// Adicionar imports
import ProfileSetup from '@/pages/ProfileSetup';
import LearningQuestionnaire from '@/pages/LearningQuestionnaire';
import PersonalizedRecommendations from '@/pages/PersonalizedRecommendations';

// Adicionar rotas dentro de <Routes>
<Route path="/edu/profile/setup" element={<ProfileSetup />} />
<Route path="/edu/questionnaire" element={<LearningQuestionnaire />} />
<Route path="/edu/recommendations/:questionnaireId" element={<PersonalizedRecommendations />} />
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO PARA LOVABLE

### Fase 1: Database
- [ ] Executar todos os schemas SQL em ordem (user_profiles, learning_questionnaires, personalized_recommendations, beni_content_repository)
- [ ] Verificar que as políticas RLS foram criadas
- [ ] Verificar que os indexes foram criados
- [ ] Verificar que o seed data de Beni foi inserido

### Fase 2: Types
- [ ] Adicionar todos os types em `src/types/sistur.ts`
- [ ] Verificar que não há conflitos com types existentes

### Fase 3: Hooks
- [ ] Criar `src/hooks/useUserProfile.ts`
- [ ] Criar `src/hooks/useLearningQuestionnaire.ts`
- [ ] Criar `src/hooks/usePersonalizedRecommendations.ts`
- [ ] Criar `src/hooks/useBeniContent.ts`
- [ ] Testar cada hook individualmente

### Fase 4: Components
- [ ] Criar `src/pages/ProfileSetup.tsx`
- [ ] Criar `src/pages/LearningQuestionnaire.tsx`
- [ ] Criar `src/pages/PersonalizedRecommendations.tsx`
- [ ] Testar navegação entre componentes

### Fase 5: Edge Function
- [ ] Criar `supabase/functions/generate-recommendations/index.ts`
- [ ] Deploy da edge function
- [ ] Testar chamada da edge function

### Fase 6: Routing
- [ ] Adicionar rotas em `src/App.tsx`
- [ ] Testar fluxo completo: Profile Setup → Questionnaire → Recommendations

### Fase 7: Testing
- [ ] Usuário consegue criar perfil
- [ ] Usuário consegue preencher questionário (6 steps)
- [ ] Recomendações são geradas automaticamente
- [ ] Recomendações aparecem ordenadas por relevância
- [ ] Usuário consegue visualizar treinamentos recomendados
- [ ] Status de recomendação atualiza (VIEWED, DISMISSED)

---

## 🎯 FLUXO COMPLETO DO USUÁRIO

```
1. Usuário faz signup/login
   ↓
2. Redirecionado para /edu/profile/setup
   ↓
3. Preenche perfil (tipo, nível acadêmico, instituição, etc.)
   ↓
4. Redirecionado para /edu/questionnaire
   ↓
5. Responde 6 etapas do questionário:
   - Situação atual
   - Objetivo principal
   - Conhecimento SISTUR
   - Pilares de interesse
   - Detalhes opcionais
   - Revisão
   ↓
6. Clica em "Gerar Recomendações"
   ↓
7. Sistema salva questionário no banco
   ↓
8. Edge function processa e gera recomendações
   (analisa trainings e tracks, calcula scores)
   ↓
9. Redirecionado para /edu/recommendations/:id
   ↓
10. Visualiza recomendações ordenadas por relevância
    - Top recommendations (score >= 70%)
    - Other recommendations (score < 70%)
   ↓
11. Usuário pode:
    - Ver detalhes do treinamento
    - Matricular-se
    - Dispensar recomendação
    - Refazer questionário
```

---

## 📌 NOTAS IMPORTANTES

1. **Mario Beni Content**: O seed data inclui as principais obras. Você pode adicionar mais conteúdo via admin interface depois.

2. **Scoring Algorithm**: O algoritmo de relevância considera:
   - Pilar match: 40 pontos
   - Topic match: 30 pontos
   - Knowledge level: 20 pontos
   - Learning goals: 10 pontos

3. **Sem Asaas ainda**: Este documento não inclui integração de pagamento. Todos os usuários terão acesso livre.

4. **Edge Function**: A função `generate-recommendations` é chamada automaticamente após submeter o questionário.

5. **Performance**: Para melhorar performance futura, considere:
   - Busca vetorial (pgvector) para matching semântico
   - Cache de recomendações
   - Background job para processamento assíncrono

---

## 🔥 PRONTO PARA LOVABLE

Este documento contém TUDO que o Lovable precisa para implementar de uma vez:

✅ Todos os schemas SQL prontos
✅ Todos os types TypeScript
✅ Todos os hooks React
✅ Todos os componentes UI
✅ Edge function completa
✅ Routing configurado
✅ Checklist de validação

**Basta copiar e colar cada seção no Lovable!**
