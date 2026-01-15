# SISTUR EDU - Guia de Implementação Completo
## Análise do Estado Atual e Plano de Desenvolvimento

**Versão**: 1.0
**Data**: Janeiro 2026
**Preparado para**: Lovable Platform

---

## 📋 Índice

1. [Análise do Estado Atual](#análise-do-estado-atual)
2. [Gaps Identificados](#gaps-identificados)
3. [Arquitetura Proposta](#arquitetura-proposta)
4. [Prompts para Lovable - Implementação](#prompts-para-lovable)
5. [Schemas de Banco de Dados](#schemas-de-banco-de-dados)
6. [Componentes de Interface](#componentes-de-interface)
7. [Edge Functions](#edge-functions)
8. [Plano de Testes](#plano-de-testes)

---

## 📊 Análise do Estado Atual

### ✅ O que JÁ ESTÁ IMPLEMENTADO

#### 1. Estrutura de Dados EDU
```sql
-- Tabelas existentes:
✅ edu_trainings (cursos e lives unificados)
✅ edu_tracks (trilhas de aprendizagem)
✅ edu_track_trainings (relação trilha-treinamento)
✅ edu_indicator_training_map (mapeamento indicador → treinamento)
✅ edu_enrollments (matrículas)
✅ edu_progress (progresso do usuário)
✅ edu_events (eventos de aprendizagem)
✅ user_training_progress (conclusão de treinamentos)
```

#### 2. Funcionalidades Existentes

**✅ Catálogo de Cursos** (`/edu/catalogo`)
- Listagem de cursos e lives
- Filtros por pilar (RA, OE, AO)
- Filtros por tipo (curso, live)
- Busca por nome/código
- Estatísticas de conteúdo

**✅ Sistema de Trilhas** (`/edu/trilhas`)
- Criação de trilhas
- Associação de treinamentos
- Progressão do usuário
- Certificados

**✅ Recomendações Baseadas em Diagnóstico** (`/learning`)
- Recomendações por indicadores
- Scoring de relevância
- Filtro IGMA (bloqueio sistêmico)
- Recomendações de cursos, lives e trilhas

**✅ Integração com YouTube**
- Ingestão automática de vídeos do canal @ProfessorMarioBeni
- Player integrado (suporta YouTube, Vimeo, Mux, Supabase)
- Metadados e miniatura

**✅ Sistema de Usuários**
- Perfis básicos
- Roles: ADMIN, ANALYST, VIEWER
- Multi-tenancy (orgs)
- RLS (Row Level Security)

**✅ Motor IGMA**
- 6 regras sistêmicas de Mario Beni
- Bloqueio de treinamentos por pilar
- Interpretação territorial

---

### ❌ O que NÃO ESTÁ IMPLEMENTADO (Gaps Críticos)

#### 1. **PERFIS DE USUÁRIO EXPANDIDOS** ❌
**Requerido**:
- Aluno (graduação/técnico)
- Professor
- Pesquisador/Pós-graduação
- Gestor público
- Empresário/Executivo
- Consultor/Técnico
- Institucional

**Estado Atual**: Apenas roles genéricos (ADMIN/ANALYST/VIEWER)

---

#### 2. **MODO CURSO ON-DEMAND (Inteligente)** ❌
**Requerido**: Geração automática de cursos personalizados via questionário

**Fluxo Esperado**:
```
Usuário responde questionário
  ↓
Quem é você? (perfil)
Para quê precisa? (objetivo)
Qual contexto? (cidade/instituição)
Nível de profundidade?
Pilar predominante?
Prazo?
Tipo de entrega? (curso, plano de aula, TCC, capacitação)
  ↓
Sistema gera curso personalizado
  ↓
Baseado 100% em conteúdo Mario Beni
  ↓
Organizado por RA/OE/AO
  ↓
Com aulas, textos, exercícios, referências
```

**Estado Atual**: ❌ Não existe. Apenas cursos prontos e recomendações estáticas.

---

#### 3. **CASOS DE USO ESPECÍFICOS** ❌

**3.1 Professor - Plano de Aula**
```
Input: "Preciso de um plano de aula sobre Planejamento Turístico
        Sistêmico para ensino médio."

Output esperado:
- Plano de aula estruturado
- Objetivos de aprendizagem
- Conteúdo programático
- Metodologia de ensino
- Avaliação
- Referências (todas Mario Beni)
```

**Estado Atual**: ❌ Não implementado

---

**3.2 Aluno - Suporte a TCC**
```
Input: "Preciso concluir meu TCC sobre governança turística municipal."

Output esperado:
- Estrutura lógica do TCC
- Capítulos sugeridos
- Fundamentação teórica (SISTUR)
- Conexão com modelo Beni
- Orientações metodológicas
```

**Estado Atual**: ❌ Não implementado

---

**3.3 Gestor Público - Capacitação Técnica**
```
Input: "Quero capacitar minha equipe para usar indicadores turísticos."

Output esperado:
- Curso técnico personalizado
- Casos aplicados
- Integração com SISTUR ERP
- Relatórios de aprendizado
- Certificação
```

**Estado Atual**: ⚠️ Parcialmente (existe curso pronto, mas não personalizado)

---

#### 4. **GOVERNANÇA DE CONTEÚDO (Mario Beni Only)** ⚠️

**Regra de Ouro**:
> "A plataforma NÃO cria conteúdo novo. Ela reorganiza, adapta e ensina o conteúdo existente de Mario Beni."

**Estado Atual**:
- ✅ Ingestão de YouTube do @ProfessorMarioBeni
- ❌ Sem repositório estruturado de textos/livros/papers de Mario Beni
- ❌ Sem validação de que todo conteúdo é exclusivamente Beni
- ❌ Sem sistema de citações e referências automáticas

---

#### 5. **PLANOS DE ASSINATURA** ❌

**Requerido**:
```typescript
const PLANOS_SISTUR_EDU = {
  INDIVIDUAL_BASICO: {
    valor: 'R$ 97/mês',
    acesso: ['cursos prontos', '3 gerações on-demand/mês'],
    publico: ['alunos', 'professores']
  },
  PROFISSIONAL_EXECUTIVO: {
    valor: 'R$ 297/mês',
    acesso: ['todos os cursos', '10 gerações on-demand/mês', 'trilhas personalizadas'],
    publico: ['gestores', 'empresários', 'consultores']
  },
  INSTITUCIONAL: {
    valor: 'Licença por instituição',
    acesso: ['usuários ilimitados', 'relatórios', 'integração SISTUR ERP'],
    publico: ['prefeituras', 'estados', 'universidades', 'empresas']
  },
  ACADEMICO_PREMIUM: {
    valor: 'R$ 497/mês',
    acesso: ['suporte TCC/dissertações/teses', 'entregas orientadas'],
    publico: ['pesquisadores', 'pós-graduação']
  }
};
```

**Estado Atual**: ❌ Não implementado (sem sistema de cobrança integrado)

---

#### 6. **RASTREAMENTO DE CONTEÚDO MARIO BENI** ❌

**Necessário**:
- Repositório de obras de Mario Beni
- Taxonomia de conteúdos (livros, capítulos, artigos, palestras)
- Sistema de citações automáticas
- Versioning de conteúdo
- Auditoria de fontes

**Estado Atual**: ❌ Não implementado

---

## 🏗️ Arquitetura Proposta

### Nova Estrutura de Dados

```sql
-- 1. PERFIS EXPANDIDOS
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id),

  -- Tipo de perfil (novo enum)
  profile_type TEXT NOT NULL CHECK (profile_type IN (
    'STUDENT',              -- Aluno
    'TEACHER',              -- Professor
    'RESEARCHER',           -- Pesquisador/Pós
    'PUBLIC_MANAGER',       -- Gestor público
    'ENTREPRENEUR',         -- Empresário
    'CONSULTANT',           -- Consultor
    'INSTITUTIONAL'         -- Institucional
  )),

  -- Contexto adicional
  academic_level TEXT CHECK (academic_level IN (
    'HIGH_SCHOOL',         -- Ensino médio
    'UNDERGRADUATE',       -- Graduação
    'GRADUATE',            -- Pós-graduação
    'DOCTORATE',           -- Doutorado
    'PROFESSIONAL'         -- Técnico/profissional
  )),

  institution_name TEXT,
  city TEXT,
  state TEXT,
  area_of_interest TEXT[],

  -- Limites de uso (para planos)
  monthly_on_demand_limit INTEGER DEFAULT 3,
  on_demand_used_this_month INTEGER DEFAULT 0,
  subscription_tier TEXT CHECK (subscription_tier IN (
    'BASIC',
    'PROFESSIONAL',
    'INSTITUTIONAL',
    'ACADEMIC_PREMIUM'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_type ON user_profiles(profile_type);
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);

-- 2. REPOSITÓRIO DE CONTEÚDO MARIO BENI
CREATE TABLE beni_content_repository (
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

  -- Organização por pilares
  primary_pillar TEXT CHECK (primary_pillar IN ('RA', 'OE', 'AO')),
  secondary_pillars TEXT[],

  -- Taxonomia de tópicos
  topics TEXT[],
  keywords TEXT[],

  -- Conteúdo
  abstract TEXT,
  full_text TEXT,              -- Texto completo (quando disponível)
  summary TEXT,                -- Resumo estruturado
  key_concepts JSONB,          -- Conceitos-chave extraídos

  -- Referências cruzadas
  related_content_ids UUID[],

  -- Metadados de uso
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beni_content_type ON beni_content_repository(content_type);
CREATE INDEX idx_beni_content_pillar ON beni_content_repository(primary_pillar);
CREATE INDEX idx_beni_content_year ON beni_content_repository(publication_year);

-- 3. CURSOS ON-DEMAND GERADOS
CREATE TABLE on_demand_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contexto da solicitação
  request_type TEXT NOT NULL CHECK (request_type IN (
    'COURSE',             -- Curso completo
    'LESSON_PLAN',        -- Plano de aula
    'TCC_SUPPORT',        -- Suporte TCC
    'THESIS_SUPPORT',     -- Suporte dissertação/tese
    'TECHNICAL_TRAINING'  -- Capacitação técnica
  )),

  -- Questionário respondido
  questionnaire_data JSONB NOT NULL,
  /*
  Estrutura esperada:
  {
    "profile_type": "TEACHER",
    "objective": "Ensinar planejamento turístico sistêmico",
    "context": {
      "institution": "IFSP",
      "city": "São Paulo",
      "target_audience": "Ensino médio"
    },
    "depth_level": "INTERMEDIATE",
    "primary_pillar": "OE",
    "deadline": "2026-02-15",
    "preferred_format": "VIDEO_AND_TEXT"
  }
  */

  -- Curso gerado
  course_title TEXT NOT NULL,
  course_description TEXT,
  course_structure JSONB NOT NULL,
  /*
  Estrutura esperada:
  {
    "modules": [
      {
        "module_number": 1,
        "title": "Introdução ao SISTUR",
        "duration": "2 horas",
        "lessons": [
          {
            "lesson_number": 1,
            "title": "Teoria Sistêmica do Turismo",
            "content": "...",
            "beni_references": ["uuid1", "uuid2"],
            "activities": [...]
          }
        ]
      }
    ],
    "assessment": {...},
    "references": [...]
  }
  */

  -- Rastreamento de fontes Mario Beni
  beni_content_used UUID[] DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GENERATED', 'ACTIVE', 'COMPLETED')),
  generation_method TEXT DEFAULT 'AI_ASSISTED',

  -- Métricas
  generation_time_seconds INTEGER,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_on_demand_courses_user ON on_demand_courses(user_id);
CREATE INDEX idx_on_demand_courses_type ON on_demand_courses(request_type);
CREATE INDEX idx_on_demand_courses_status ON on_demand_courses(status);

-- 4. CITAÇÕES E REFERÊNCIAS AUTOMÁTICAS
CREATE TABLE course_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES on_demand_courses(id) ON DELETE CASCADE,
  beni_content_id UUID REFERENCES beni_content_repository(id),

  -- Contexto da citação
  module_number INTEGER,
  lesson_number INTEGER,
  citation_context TEXT,
  quote_text TEXT,
  page_number TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. HISTÓRICO DE USO ON-DEMAND (para limites de plano)
CREATE TABLE on_demand_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES on_demand_courses(id),

  request_type TEXT,
  month_year TEXT,  -- formato: "2026-01"

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_log_user_month ON on_demand_usage_log(user_id, month_year);

-- 6. PLANOS E ASSINATURAS
CREATE TABLE edu_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id),

  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN (
    'BASIC',
    'PROFESSIONAL',
    'INSTITUTIONAL',
    'ACADEMIC_PREMIUM'
  )),

  -- Limites do plano
  monthly_on_demand_limit INTEGER,
  user_limit INTEGER,  -- NULL = ilimitado

  -- Status
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED')),

  -- Billing (integração futura com Asaas/Stripe)
  billing_cycle TEXT CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
  price_brl DECIMAL(10,2),

  -- Datas
  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Prompts para Lovable - Implementação

### PROMPT 1: Criar Perfis de Usuário Expandidos

```markdown
# Task: Implementar Sistema de Perfis de Usuário SISTUR EDU

## Contexto
O SISTUR EDU precisa diferenciar tipos de usuários (aluno, professor, gestor, etc.)
para personalizar conteúdo e funcionalidades.

## Requisitos

### 1. Database Schema
Criar nova tabela `user_profiles` com os seguintes campos:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id),

  profile_type TEXT NOT NULL CHECK (profile_type IN (
    'STUDENT',           -- Aluno
    'TEACHER',           -- Professor
    'RESEARCHER',        -- Pesquisador/Pós
    'PUBLIC_MANAGER',    -- Gestor público
    'ENTREPRENEUR',      -- Empresário
    'CONSULTANT',        -- Consultor
    'INSTITUTIONAL'      -- Institucional
  )),

  academic_level TEXT CHECK (academic_level IN (
    'HIGH_SCHOOL',
    'UNDERGRADUATE',
    'GRADUATE',
    'DOCTORATE',
    'PROFESSIONAL'
  )),

  institution_name TEXT,
  city TEXT,
  state TEXT,
  area_of_interest TEXT[],

  -- Limites de plano
  monthly_on_demand_limit INTEGER DEFAULT 3,
  on_demand_used_this_month INTEGER DEFAULT 0,
  subscription_tier TEXT CHECK (subscription_tier IN (
    'BASIC',
    'PROFESSIONAL',
    'INSTITUTIONAL',
    'ACADEMIC_PREMIUM'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_type ON user_profiles(profile_type);
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
```

**RLS Policies:**
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 2. TypeScript Types
Adicionar em `src/types/sistur.ts`:

```typescript
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

export type SubscriptionTier =
  | 'BASIC'
  | 'PROFESSIONAL'
  | 'INSTITUTIONAL'
  | 'ACADEMIC_PREMIUM';

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
  monthly_on_demand_limit: number;
  on_demand_used_this_month: number;
  subscription_tier?: SubscriptionTier;
  created_at: string;
  updated_at: string;
}
```

### 3. React Hook
Criar `src/hooks/useUserProfile.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { UserProfile, ProfileType, AcademicLevel, SubscriptionTier } from '@/types/sistur';

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
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id
  });
}

export function useUserProfileMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createProfile = useMutation({
    mutationFn: async (profile: Partial<UserProfile>) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user?.id,
          ...profile
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Perfil criado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar perfil: ${error.message}`);
    }
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Perfil atualizado');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  return { createProfile, updateProfile };
}
```

### 4. UI Component - Profile Setup
Criar `src/components/edu/ProfileSetup.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile, useUserProfileMutations } from '@/hooks/useUserProfile';
import type { ProfileType, AcademicLevel } from '@/types/sistur';

const PROFILE_TYPES: { value: ProfileType; label: string; description: string }[] = [
  { value: 'STUDENT', label: 'Aluno', description: 'Estudante de graduação ou técnico' },
  { value: 'TEACHER', label: 'Professor', description: 'Educador de turismo' },
  { value: 'RESEARCHER', label: 'Pesquisador', description: 'Pós-graduação, mestrado ou doutorado' },
  { value: 'PUBLIC_MANAGER', label: 'Gestor Público', description: 'Secretarias de turismo' },
  { value: 'ENTREPRENEUR', label: 'Empresário', description: 'Setor privado de turismo' },
  { value: 'CONSULTANT', label: 'Consultor', description: 'Consultor técnico em turismo' },
  { value: 'INSTITUTIONAL', label: 'Institucional', description: 'Prefeituras, empresas, universidades' }
];

const ACADEMIC_LEVELS: { value: AcademicLevel; label: string }[] = [
  { value: 'HIGH_SCHOOL', label: 'Ensino Médio' },
  { value: 'UNDERGRADUATE', label: 'Graduação' },
  { value: 'GRADUATE', label: 'Pós-graduação' },
  { value: 'DOCTORATE', label: 'Doutorado' },
  { value: 'PROFESSIONAL', label: 'Técnico/Profissional' }
];

export function ProfileSetup() {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { createProfile, updateProfile } = useUserProfileMutations();

  const [formData, setFormData] = useState({
    profile_type: profile?.profile_type || '',
    academic_level: profile?.academic_level || '',
    institution_name: profile?.institution_name || '',
    city: profile?.city || '',
    state: profile?.state || ''
  });

  const handleSubmit = async () => {
    if (profile) {
      await updateProfile.mutateAsync(formData);
    } else {
      await createProfile.mutateAsync(formData);
    }
    navigate('/edu/catalogo');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
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
            <Label>Quem é você?</Label>
            <Select
              value={formData.profile_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, profile_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu perfil" />
              </SelectTrigger>
              <SelectContent>
                {PROFILE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nível Acadêmico */}
          {['STUDENT', 'TEACHER', 'RESEARCHER'].includes(formData.profile_type) && (
            <div className="space-y-2">
              <Label>Nível Acadêmico</Label>
              <Select
                value={formData.academic_level}
                onValueChange={(value) => setFormData(prev => ({ ...prev, academic_level: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
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

          {/* Cidade */}
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
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!formData.profile_type}
          >
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. Integração no Fluxo de Onboarding
Adicionar rota em `src/App.tsx`:

```typescript
<Route path="/edu/profile/setup" element={<ProfileSetup />} />
```

Adicionar redirecionamento após signup:
```typescript
// Em src/pages/Auth.tsx, após signup bem-sucedido:
navigate('/edu/profile/setup');
```

## Validação
- [ ] Tabela criada no Supabase
- [ ] RLS policies funcionando
- [ ] Hook carrega perfil existente
- [ ] Formulário salva perfil corretamente
- [ ] Redirecionamento após signup funciona
- [ ] UI responsiva e acessível
```

---

### PROMPT 2: Implementar Modo Curso On-Demand (Geração Inteligente)

```markdown
# Task: Implementar Sistema de Curso On-Demand no SISTUR EDU

## Contexto
Usuários devem poder gerar cursos personalizados respondendo um questionário,
baseado 100% em conteúdo de Mario Beni, organizado por pilares RA/OE/AO.

## Arquitetura

### Fluxo:
1. Usuário acessa `/edu/on-demand`
2. Responde questionário (perfil, objetivo, contexto, profundidade, pilar, prazo)
3. Sistema valida limite mensal do plano
4. Edge function gera curso via AI (GPT-4 ou Claude)
5. Curso salvo em `on_demand_courses`
6. Usuário acessa curso gerado

## Requisitos

### 1. Database Schema
```sql
CREATE TABLE on_demand_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  request_type TEXT NOT NULL CHECK (request_type IN (
    'COURSE',             -- Curso completo
    'LESSON_PLAN',        -- Plano de aula
    'TCC_SUPPORT',        -- Suporte TCC
    'THESIS_SUPPORT',     -- Suporte dissertação/tese
    'TECHNICAL_TRAINING'  -- Capacitação técnica
  )),

  questionnaire_data JSONB NOT NULL,
  course_title TEXT NOT NULL,
  course_description TEXT,
  course_structure JSONB NOT NULL,

  beni_content_used UUID[] DEFAULT '{}',

  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GENERATED', 'ACTIVE', 'COMPLETED')),
  generation_method TEXT DEFAULT 'AI_ASSISTED',

  generation_time_seconds INTEGER,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_on_demand_courses_user ON on_demand_courses(user_id);
CREATE INDEX idx_on_demand_courses_type ON on_demand_courses(request_type);

-- Tabela de uso mensal (para limites de plano)
CREATE TABLE on_demand_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES on_demand_courses(id),
  request_type TEXT,
  month_year TEXT,  -- "2026-01"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_log_user_month ON on_demand_usage_log(user_id, month_year);
```

### 2. Edge Function - Generate On-Demand Course
Criar `supabase/functions/generate-on-demand-course/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  try {
    const { questionnaire, user_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Validar limite mensal do usuário
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('monthly_on_demand_limit, on_demand_used_this_month, subscription_tier')
      .eq('user_id', user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({
        error: 'Perfil não encontrado. Complete seu perfil primeiro.'
      }), { status: 400 });
    }

    if (profile.on_demand_used_this_month >= profile.monthly_on_demand_limit) {
      return new Response(JSON.stringify({
        error: `Limite mensal atingido (${profile.monthly_on_demand_limit} gerações/mês). Faça upgrade do plano.`,
        upgrade_required: true
      }), { status: 429 });
    }

    // 2. Buscar conteúdo relevante de Mario Beni
    // (Placeholder - depois implementar busca vetorial)
    const { data: beniContent } = await supabase
      .from('beni_content_repository')
      .select('*')
      .eq('primary_pillar', questionnaire.primary_pillar)
      .limit(10);

    // 3. Gerar prompt para GPT-4
    const systemPrompt = `
Você é um especialista na metodologia SISTUR de Mario Carlos Beni.
Seu trabalho é criar conteúdo educacional personalizado baseado EXCLUSIVAMENTE
nas obras e ensinamentos de Mario Beni.

REGRAS ABSOLUTAS:
- Use APENAS conteúdo de Mario Beni (fornecido no contexto)
- Organize tudo pelos pilares: RA (Relações Ambientais), OE (Organização Estrutural), AO (Ações Operacionais)
- Cite as fontes corretamente
- Não invente conceitos - apenas reorganize o que Beni escreveu
- Adapte a linguagem ao nível acadêmico do aluno

CONTEXTO DO ALUNO:
- Perfil: ${questionnaire.profile_type}
- Objetivo: ${questionnaire.objective}
- Nível: ${questionnaire.depth_level}
- Pilar foco: ${questionnaire.primary_pillar}
`;

    const userPrompt = `
Crie um ${questionnaire.request_type} sobre: "${questionnaire.topic}"

CONTEXTO:
${JSON.stringify(questionnaire, null, 2)}

CONTEÚDO DISPONÍVEL DE MARIO BENI:
${beniContent?.map(c => `
[${c.content_type}] ${c.title} (${c.publication_year})
Pilar: ${c.primary_pillar}
Resumo: ${c.summary}
Conceitos: ${JSON.stringify(c.key_concepts)}
`).join('\n')}

FORMATO DE RESPOSTA (JSON):
{
  "title": "Título do curso",
  "description": "Descrição geral",
  "modules": [
    {
      "module_number": 1,
      "title": "Título do módulo",
      "pillar": "RA|OE|AO",
      "duration": "2 horas",
      "lessons": [
        {
          "lesson_number": 1,
          "title": "Título da aula",
          "learning_objectives": ["Objetivo 1", "Objetivo 2"],
          "content": "Conteúdo detalhado da aula...",
          "key_concepts": ["Conceito 1", "Conceito 2"],
          "beni_citations": [
            {
              "text": "Citação textual de Beni",
              "source": "Título da obra",
              "year": 2001,
              "page": "45"
            }
          ],
          "activities": [
            {
              "type": "exercise|discussion|case_study",
              "description": "Descrição da atividade"
            }
          ]
        }
      ]
    }
  ],
  "assessment": {
    "type": "Tipo de avaliação",
    "criteria": ["Critério 1", "Critério 2"]
  },
  "references": [
    {
      "author": "BENI, Mario Carlos",
      "title": "Título da obra",
      "year": 2001,
      "publisher": "Editora"
    }
  ]
}
`;

    // 4. Chamar GPT-4
    const startTime = Date.now();
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    });

    const gptData = await gptResponse.json();
    const generatedCourse = JSON.parse(gptData.choices[0].message.content);
    const generationTime = Math.floor((Date.now() - startTime) / 1000);

    // 5. Salvar curso gerado
    const { data: course, error: courseError } = await supabase
      .from('on_demand_courses')
      .insert({
        user_id,
        request_type: questionnaire.request_type,
        questionnaire_data: questionnaire,
        course_title: generatedCourse.title,
        course_description: generatedCourse.description,
        course_structure: generatedCourse,
        beni_content_used: beniContent?.map(c => c.id) || [],
        status: 'GENERATED',
        generation_time_seconds: generationTime
      })
      .select()
      .single();

    if (courseError) throw courseError;

    // 6. Registrar uso mensal
    const monthYear = new Date().toISOString().substring(0, 7);
    await supabase.from('on_demand_usage_log').insert({
      user_id,
      course_id: course.id,
      request_type: questionnaire.request_type,
      month_year: monthYear
    });

    // 7. Incrementar contador de uso
    await supabase
      .from('user_profiles')
      .update({
        on_demand_used_this_month: profile.on_demand_used_this_month + 1
      })
      .eq('user_id', user_id);

    return new Response(JSON.stringify({
      success: true,
      course_id: course.id,
      generation_time: generationTime,
      remaining_generations: profile.monthly_on_demand_limit - profile.on_demand_used_this_month - 1
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating course:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### 3. React Component - On-Demand Form
Criar `src/pages/OnDemandCourse.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

export default function OnDemandCourse() {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    request_type: 'COURSE',
    topic: '',
    objective: '',
    context: '',
    depth_level: 'INTERMEDIATE',
    primary_pillar: 'RA',
    deadline: '',
    preferred_format: 'VIDEO_AND_TEXT'
  });

  const handleGenerate = async () => {
    if (!profile) {
      toast.error('Complete seu perfil primeiro');
      navigate('/edu/profile/setup');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-on-demand-course', {
        body: {
          questionnaire: {
            ...formData,
            profile_type: profile.profile_type,
            academic_level: profile.academic_level
          },
          user_id: profile.user_id
        }
      });

      if (error) throw error;

      if (data.upgrade_required) {
        toast.error(data.error);
        navigate('/edu/plans');
        return;
      }

      toast.success(`Curso gerado em ${data.generation_time}s! Você tem ${data.remaining_generations} gerações restantes este mês.`);
      navigate(`/edu/on-demand/${data.course_id}`);

    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Gerar Curso On-Demand" subtitle="Baseado na metodologia Mario Beni">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={(step / 5) * 100} className="mb-2" />
          <p className="text-sm text-muted-foreground">Passo {step} de 5</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {step === 1 && 'Tipo de Conteúdo'}
              {step === 2 && 'Sobre o que você precisa?'}
              {step === 3 && 'Contexto e Objetivo'}
              {step === 4 && 'Nível e Pilar'}
              {step === 5 && 'Revisão e Geração'}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Tipo */}
            {step === 1 && (
              <div className="space-y-4">
                <Label>O que você precisa?</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { value: 'COURSE', label: 'Curso Completo', desc: 'Curso estruturado com módulos' },
                    { value: 'LESSON_PLAN', label: 'Plano de Aula', desc: 'Para professores' },
                    { value: 'TCC_SUPPORT', label: 'Suporte TCC', desc: 'Estrutura e fundamentação' },
                    { value: 'THESIS_SUPPORT', label: 'Suporte Tese', desc: 'Mestrado/doutorado' },
                    { value: 'TECHNICAL_TRAINING', label: 'Capacitação Técnica', desc: 'Para equipes' }
                  ].map(type => (
                    <Card
                      key={type.value}
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        formData.request_type === type.value ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, request_type: type.value }))}
                    >
                      <CardContent className="pt-6">
                        <h4 className="font-medium mb-1">{type.label}</h4>
                        <p className="text-sm text-muted-foreground">{type.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Tópico */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Título ou Tema</Label>
                  <Input
                    value={formData.topic}
                    onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="Ex: Planejamento Turístico Sistêmico"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Contexto */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Para quê você precisa?</Label>
                  <Textarea
                    value={formData.objective}
                    onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                    placeholder="Ex: Ensinar alunos de ensino médio sobre turismo sustentável"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Contexto (cidade, instituição, público-alvo)</Label>
                  <Textarea
                    value={formData.context}
                    onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
                    placeholder="Ex: IFSP São Paulo, turma de 30 alunos, curso técnico em turismo"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Nível e Pilar */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <Label>Nível de Profundidade</Label>
                  <Select
                    value={formData.depth_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, depth_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASIC">Básico</SelectItem>
                      <SelectItem value="INTERMEDIATE">Intermediário</SelectItem>
                      <SelectItem value="ADVANCED">Avançado</SelectItem>
                      <SelectItem value="EXPERT">Especialista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Pilar Predominante</Label>
                  <Select
                    value={formData.primary_pillar}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, primary_pillar: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RA">RA - Relações Ambientais</SelectItem>
                      <SelectItem value="OE">OE - Organização Estrutural</SelectItem>
                      <SelectItem value="AO">AO - Ações Operacionais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 5: Revisão */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                  <div><strong>Tipo:</strong> {formData.request_type}</div>
                  <div><strong>Tema:</strong> {formData.topic}</div>
                  <div><strong>Objetivo:</strong> {formData.objective}</div>
                  <div><strong>Nível:</strong> {formData.depth_level}</div>
                  <div><strong>Pilar:</strong> {formData.primary_pillar}</div>
                </div>

                {profile && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm">
                      Você tem <strong>{profile.monthly_on_demand_limit - profile.on_demand_used_this_month}</strong> gerações
                      restantes este mês (Plano: {profile.subscription_tier || 'BASIC'})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Voltar
                </Button>
              )}

              {step < 5 && (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 2 && !formData.topic) ||
                    (step === 3 && (!formData.objective || !formData.context))
                  }
                  className="ml-auto"
                >
                  Próximo
                </Button>
              )}

              {step === 5 && (
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="ml-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar Curso
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
```

### 4. Adicionar Rota
Em `src/App.tsx`:

```typescript
<Route path="/edu/on-demand" element={<OnDemandCourse />} />
<Route path="/edu/on-demand/:courseId" element={<OnDemandCourseView />} />
```

## Validação
- [ ] Tabela `on_demand_courses` criada
- [ ] Edge function deployada
- [ ] Variável de ambiente `OPENAI_API_KEY` configurada
- [ ] Formulário multi-step funciona
- [ ] Validação de limites mensais funciona
- [ ] Curso gerado salvo corretamente
- [ ] Redirecionamento para visualização funciona
```

---

### PROMPT 3: Implementar Repositório de Conteúdo Mario Beni

```markdown
# Task: Criar Repositório Estruturado de Conteúdo Mario Beni

## Contexto
Precisamos de um repositório centralizado de todo conteúdo de Mario Beni
(livros, artigos, palestras, vídeos) para garantir que cursos on-demand
sejam baseados 100% em suas obras.

## Requisitos

### 1. Database Schema
```sql
CREATE TABLE beni_content_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  content_type TEXT NOT NULL CHECK (content_type IN (
    'BOOK',
    'BOOK_CHAPTER',
    'ARTICLE',
    'LECTURE',
    'VIDEO',
    'INTERVIEW',
    'THESIS'
  )),

  -- Metadados bibliográficos
  title TEXT NOT NULL,
  subtitle TEXT,
  publication_year INTEGER,
  publisher TEXT,
  isbn TEXT,
  doi TEXT,
  url TEXT,

  -- Pilares
  primary_pillar TEXT CHECK (primary_pillar IN ('RA', 'OE', 'AO')),
  secondary_pillars TEXT[],

  -- Taxonomia
  topics TEXT[],
  keywords TEXT[],

  -- Conteúdo
  abstract TEXT,
  full_text TEXT,
  summary TEXT,
  key_concepts JSONB,

  -- Referências cruzadas
  related_content_ids UUID[],

  -- Uso
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beni_content_type ON beni_content_repository(content_type);
CREATE INDEX idx_beni_content_pillar ON beni_content_repository(primary_pillar);
CREATE INDEX idx_beni_content_year ON beni_content_repository(publication_year);

-- Full text search
CREATE INDEX idx_beni_content_search ON beni_content_repository
  USING gin(to_tsvector('portuguese', title || ' ' || COALESCE(abstract, '') || ' ' || COALESCE(summary, '')));
```

### 2. Seed Data - Principais Obras de Mario Beni
Criar `supabase/seed_beni_content.sql`:

```sql
INSERT INTO beni_content_repository (
  content_type,
  title,
  subtitle,
  publication_year,
  publisher,
  isbn,
  primary_pillar,
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
  ARRAY['teoria sistêmica', 'SISTUR', 'análise estrutural'],
  ARRAY['turismo', 'sistema', 'Beni', 'SISTUR'],
  'Obra fundamental que apresenta o modelo SISTUR (Sistema de Turismo) e a teoria sistêmica aplicada ao turismo.',
  'Este livro revolucionou os estudos de turismo no Brasil ao apresentar uma abordagem sistêmica. Beni propõe o modelo SISTUR, que divide o sistema turístico em três conjuntos: Relações Ambientais (RA), Organização Estrutural (OE) e Ações Operacionais (AO).',
  '{
    "sistur_model": "Sistema aberto com três conjuntos interdependentes",
    "ra": "Relações Ambientais - base ecológica, social e cultural",
    "oe": "Organização Estrutural - infraestrutura e superestrutura",
    "ao": "Ações Operacionais - comercialização e execução",
    "systems_theory": "Turismo como sistema aberto em interação com ambiente"
  }'::jsonb
),
(
  'BOOK_CHAPTER',
  'O Conjunto das Relações Ambientais',
  'in: Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'RA',
  ARRAY['meio ambiente', 'sustentabilidade', 'patrimônio cultural'],
  ARRAY['RA', 'ambiente', 'ecologia', 'cultura'],
  'Capítulo que detalha o primeiro conjunto do SISTUR: as Relações Ambientais.',
  'Beni explica como o turismo depende fundamentalmente do meio ambiente (natural e cultural). O RA é a base do sistema, pois sem recursos ambientais preservados, não há turismo sustentável.',
  '{
    "primacy_of_environment": "RA é a base de todo o sistema turístico",
    "subsistemas_ra": ["ecológico", "social", "econômico", "cultural"],
    "carrying_capacity": "Capacidade de carga ambiental",
    "sustainability": "Sustentabilidade como princípio fundamental"
  }'::jsonb
),
(
  'BOOK_CHAPTER',
  'O Conjunto da Organização Estrutural',
  'in: Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'OE',
  ARRAY['infraestrutura', 'governança', 'planejamento'],
  ARRAY['OE', 'infraestrutura', 'superestrutura', 'planejamento'],
  'Capítulo dedicado ao segundo conjunto do SISTUR: a Organização Estrutural.',
  'Detalha a infraestrutura (rodovias, aeroportos, hotéis) e a superestrutura (órgãos de turismo, legislação, políticas públicas) necessárias para o turismo.',
  '{
    "infraestrutura": "Base física e serviços",
    "superestrutura": "Organizações, leis e políticas",
    "dependencia_ra": "OE só funciona se RA estiver saudável",
    "planejamento": "Necessidade de planejamento integrado"
  }'::jsonb
),
(
  'BOOK_CHAPTER',
  'O Conjunto das Ações Operacionais',
  'in: Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'AO',
  ARRAY['operação turística', 'marketing', 'gestão'],
  ARRAY['AO', 'operação', 'marketing', 'comercialização'],
  'Capítulo sobre o terceiro conjunto do SISTUR: as Ações Operacionais.',
  'Aborda a comercialização, operação e distribuição de produtos turísticos. É o conjunto mais visível para o turista final.',
  '{
    "comercializacao": "Distribuição e venda de produtos turísticos",
    "operacao": "Execução de serviços turísticos",
    "marketing": "Promoção e comunicação",
    "experiencia": "Entrega da experiência turística",
    "subordinacao": "AO depende de RA e OE funcionarem bem"
  }'::jsonb
);

-- Adicionar mais obras...
```

### 3. Admin Page - Gerenciar Conteúdo
Criar `src/pages/AdminBeniContent.tsx`:

```typescript
import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Plus, Search } from 'lucide-react';

export default function AdminBeniContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: contents, isLoading } = useQuery({
    queryKey: ['beni-content', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('beni_content_repository')
        .select('*')
        .order('publication_year', { ascending: false });

      if (searchQuery) {
        query = query.textSearch('title', searchQuery);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const addContent = useMutation({
    mutationFn: async (content: any) => {
      const { data, error } = await supabase
        .from('beni_content_repository')
        .insert(content)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beni-content'] });
      toast.success('Conteúdo adicionado');
    }
  });

  return (
    <AppLayout title="Repositório Mario Beni" subtitle="Gerenciar obras e conteúdos">
      <div className="space-y-6">
        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar obras de Mario Beni..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Obra
          </Button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contents?.map(content => (
            <Card key={content.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg">{content.title}</span>
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Tipo:</strong> {content.content_type}</div>
                  <div><strong>Ano:</strong> {content.publication_year}</div>
                  <div><strong>Pilar:</strong> {content.primary_pillar}</div>
                  <div><strong>Usado:</strong> {content.usage_count} vezes</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
```

## Validação
- [ ] Tabela criada
- [ ] Seed data inserido
- [ ] Busca full-text funciona
- [ ] Admin pode adicionar/editar conteúdo
- [ ] Edge function de geração referencia este repositório
```

---

### PROMPT 4: Implementar Planos de Assinatura

```markdown
# Task: Criar Sistema de Planos e Assinaturas SISTUR EDU

## Contexto
Usuários devem escolher planos com limites diferentes de geração on-demand.

## Planos Propostos
```typescript
const SISTUR_EDU_PLANS = {
  BASIC: {
    name: 'Individual Básico',
    price_brl: 97,
    on_demand_limit: 3,
    features: [
      'Acesso a cursos prontos',
      '3 gerações on-demand por mês',
      'Certificados'
    ],
    target: ['Alunos', 'Professores']
  },
  PROFESSIONAL: {
    name: 'Profissional/Executivo',
    price_brl: 297,
    on_demand_limit: 10,
    features: [
      'Todos os cursos',
      '10 gerações on-demand por mês',
      'Trilhas personalizadas',
      'Suporte prioritário'
    ],
    target: ['Gestores', 'Empresários', 'Consultores']
  },
  INSTITUTIONAL: {
    name: 'Institucional',
    price_brl: 1997,
    on_demand_limit: -1,  // ilimitado
    features: [
      'Usuários ilimitados',
      'Gerações on-demand ilimitadas',
      'Relatórios institucionais',
      'Integração SISTUR ERP',
      'Trilhas corporativas'
    ],
    target: ['Prefeituras', 'Estados', 'Universidades', 'Empresas']
  },
  ACADEMIC_PREMIUM: {
    name: 'Acadêmico Premium',
    price_brl: 497,
    on_demand_limit: 5,
    features: [
      'Suporte TCC/dissertações/teses',
      '5 gerações on-demand por mês',
      'Orientação estruturada',
      'Citações automáticas ABNT'
    ],
    target: ['Pesquisadores', 'Pós-graduação']
  }
};
```

### 1. Database Schema
```sql
CREATE TABLE edu_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id),
  user_id UUID REFERENCES auth.users(id),  -- para planos individuais

  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN (
    'BASIC',
    'PROFESSIONAL',
    'INSTITUTIONAL',
    'ACADEMIC_PREMIUM'
  )),

  monthly_on_demand_limit INTEGER,  -- -1 = ilimitado
  user_limit INTEGER,  -- NULL = ilimitado

  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED')),

  billing_cycle TEXT CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
  price_brl DECIMAL(10,2),

  -- Integração pagamento (Asaas)
  asaas_subscription_id TEXT,
  payment_method TEXT,

  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edu_subscriptions_org ON edu_subscriptions(org_id);
CREATE INDEX idx_edu_subscriptions_user ON edu_subscriptions(user_id);
CREATE INDEX idx_edu_subscriptions_status ON edu_subscriptions(status);
```

### 2. Pricing Page
Criar `src/pages/EduPlans.tsx`:

```typescript
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const PLANS = [
  {
    id: 'BASIC',
    name: 'Individual Básico',
    price: 97,
    limit: 3,
    features: [
      'Acesso a cursos prontos',
      '3 gerações on-demand/mês',
      'Certificados',
      'Progresso salvo'
    ]
  },
  {
    id: 'PROFESSIONAL',
    name: 'Profissional',
    price: 297,
    limit: 10,
    popular: true,
    features: [
      'Todos os cursos',
      '10 gerações on-demand/mês',
      'Trilhas personalizadas',
      'Suporte prioritário'
    ]
  },
  {
    id: 'INSTITUTIONAL',
    name: 'Institucional',
    price: 1997,
    limit: -1,
    features: [
      'Usuários ilimitados',
      'Gerações ilimitadas',
      'Integração SISTUR ERP',
      'Relatórios customizados'
    ]
  },
  {
    id: 'ACADEMIC_PREMIUM',
    name: 'Acadêmico Premium',
    price: 497,
    limit: 5,
    features: [
      'Suporte TCC/teses',
      '5 gerações on-demand/mês',
      'Orientação estruturada',
      'Citações ABNT'
    ]
  }
];

export default function EduPlans() {
  return (
    <AppLayout title="Planos SISTUR EDU" subtitle="Escolha o plano ideal para você">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map(plan => (
          <Card key={plan.id} className={plan.popular ? 'border-primary shadow-lg' : ''}>
            <CardHeader>
              {plan.popular && (
                <Badge className="w-fit mb-2">Mais Popular</Badge>
              )}
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">R$ {plan.price}</span>/mês
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {plan.limit === -1 ? 'Gerações ilimitadas' : `${plan.limit} gerações on-demand/mês`}
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full">
                Assinar Agora
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
```

## Validação
- [ ] Tabela criada
- [ ] Página de pricing renderiza corretamente
- [ ] Botão "Assinar" redireciona para checkout (Asaas/Stripe)
- [ ] Limites respeitados no sistema on-demand
```

---

## 📝 Resumo de Implementação

### Prioridade 1 (Essencial)
1. ✅ **Perfis de Usuário** - Base para personalização
2. ✅ **Repositório Mario Beni** - Garantia de conteúdo autêntico
3. ✅ **Curso On-Demand** - Diferencial estratégico

### Prioridade 2 (Importante)
4. ✅ **Planos e Assinaturas** - Monetização
5. ⚠️ **Casos de Uso Específicos** - TCC, Plano de Aula, etc.

### Prioridade 3 (Desejável)
6. ⚠️ **Busca Vetorial** - Para melhor matching de conteúdo
7. ⚠️ **Citações Automáticas ABNT** - Para acadêmicos
8. ⚠️ **Integração Asaas/Stripe** - Pagamentos

---

## 🎯 Próximos Passos

1. **Implementar Prompt 1** (Perfis de Usuário)
2. **Seed Repositório Beni** (manualmente com principais obras)
3. **Implementar Prompt 2** (On-Demand com GPT-4)
4. **Testar fluxo completo**
5. **Adicionar Prompt 4** (Planos)

---

**Documento preparado para Lovable**
**Versão**: 1.0
**Data**: Janeiro 2026
