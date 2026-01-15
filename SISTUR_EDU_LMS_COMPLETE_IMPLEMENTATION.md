# SISTUR EDU - LMS COMPLETO
## Sistema de Gestão de Aprendizagem com Motor On-Demand e Certificação Dinâmica

**IMPLEMENTAÇÃO COMPLETA PARA LOVABLE**

**Base Conceitual**: 100% Produção Intelectual de Mario Carlos Beni
**Governança**: Christiana Beni
**Arquitetura**: Multi-tenant SaaS com Motor Inteligente

---

## 📋 ÍNDICE

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Princípios Obrigatórios](#princípios-obrigatórios)
3. [Modelo de Dados Completo (ER)](#modelo-de-dados-completo)
4. [Perfis de Usuário e RBAC](#perfis-de-usuário-e-rbac)
5. [Motor On-Demand](#motor-on-demand)
6. [Sistema de Avaliação Anti-Cola](#sistema-de-avaliação-anti-cola)
7. [Certificação Automática](#certificação-automática)
8. [Integração SISTUR ERP](#integração-sistur-erp)
9. [Implementação Técnica](#implementação-técnica)
10. [Backlog e Sprints](#backlog-e-sprints)

---

## 🎯 VISÃO GERAL DO SISTEMA

### O que o SISTUR EDU faz

**NÃO é um LMS tradicional com cursos prontos.**
**É uma plataforma educacional inteligente que:**

1. **Constrói trilhas personalizadas on-demand**
   - Usuário declara o que quer aprender
   - Sistema monta trilha automaticamente
   - Baseado 100% em conteúdo de Mario Beni

2. **Gera provas únicas e dinâmicas**
   - Cada aluno recebe prova diferente
   - Anti-repetição inteligente
   - Randomização de questões e alternativas

3. **Emite certificação automática e auditável**
   - PDF com QR Code
   - Verificação pública
   - Logs imutáveis (governo)

4. **Integra educação com diagnóstico territorial**
   - Recebe diagnósticos do SISTUR ERP
   - Recomenda capacitações
   - Retorna status de certificação

### Frase-Guia para o Desenvolvedor

> "O SISTUR EDU não entrega cursos prontos. Ele constrói caminhos de aprendizagem únicos, no momento em que a pessoa decide aprender."

---

## 🔐 PRINCÍPIOS OBRIGATÓRIOS (NÃO NEGOCIÁVEIS)

### 1. Conteúdo Autoral Exclusivo
- ✅ **Apenas materiais de Mario Beni**
- ❌ **Nenhuma fonte externa**
- ✅ **Rastreabilidade completa** (cada aula/quiz cita a fonte original)

### 2. Educação Viva
- ✅ **Novos conteúdos entram continuamente** (lives, artigos, palestras)
- ✅ **Versionamento de cursos** (atualizar ≠ apagar histórico)
- ✅ **Aluno mantém progresso na versão que iniciou**

### 3. Três Pilares Obrigatórios
- **RA** – Relações Ambientais (meio ambiente, sustentabilidade, comunidade)
- **OE** – Organização Estrutural (infraestrutura, governança, planejamento)
- **AO** – Ações Operacionais (operação, marketing, experiência)

### 4. IA com Regras (não inventa conteúdo)
- ✅ **Seleciona e organiza** conteúdo existente
- ❌ **Não gera conteúdo novo** sem fonte
- ✅ **Auditável**: toda geração tem log de fontes usadas

### 5. Avaliação Individual e Única
- ✅ **Cada prova é única** (composição diferente por aluno)
- ❌ **Não pode haver prova fixa ou repetível**
- ✅ **Anti-repetição**: aluno não vê mesma questão 2x seguidas

---

## 📊 MODELO DE DADOS COMPLETO (ER)

### Diagrama ER Resumido

```
TENANT (cliente institucional)
  ├─ USER (usuários do tenant)
  │   ├─ USER_ROLE (perfis: aluno, professor, gestor...)
  │   ├─ ENROLLMENT (matrículas em cursos)
  │   ├─ LESSON_PROGRESS (progresso por aula)
  │   ├─ EXAM_ATTEMPT (tentativas de prova)
  │   ├─ CERTIFICATE (certificados emitidos)
  │   └─ ONDEMAND_REQUEST (solicitações on-demand)
  │
  ├─ CONTENT_ITEM (base autoral Mario Beni)
  │   ├─ pilar: RA/OE/AO
  │   ├─ nível: 1-5
  │   └─ versão
  │
  ├─ COURSE
  │   ├─ MODULE
  │   │   └─ LESSON (referencia CONTENT_ITEM)
  │   └─ versão
  │
  ├─ TRACK (trilhas: RA, OE, AO, Integrado)
  │   └─ TRACK_COURSE (relação N:N com ordem)
  │
  ├─ QUIZ_QUESTION (banco de questões)
  │   ├─ QUIZ_OPTION (alternativas)
  │   └─ QUIZ_SOURCE (auditoria: cita CONTENT_ITEM)
  │
  ├─ EXAM (prova gerada)
  │   ├─ EXAM_QUESTION (questões selecionadas)
  │   └─ composition_hash (única por composição)
  │
  └─ AUDIT_LOG (imutável, para governo)
```

---

## 🗄️ PARTE 1: DATABASE SCHEMAS COMPLETOS

### Schema 1: Multi-Tenant e Usuários

```sql
-- ==========================================
-- MULTI-TENANT
-- ==========================================

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('B2G', 'B2B', 'B2U')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_status ON tenants(status);

-- ==========================================
-- USUÁRIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  auth_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended')),
  max_level INTEGER NOT NULL DEFAULT 3 CHECK (max_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth ON users(auth_uid);

-- ==========================================
-- PERFIS (ROLES)
-- ==========================================

CREATE TABLE IF NOT EXISTS roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_max_level INTEGER DEFAULT 3 CHECK (default_max_level BETWEEN 1 AND 5),
  permissions JSONB DEFAULT '[]'
);

-- Seed inicial de roles
INSERT INTO roles (name, description, default_max_level) VALUES
  ('STUDENT', 'Estudante', 3),
  ('TEACHER', 'Professor', 4),
  ('RESEARCHER', 'Pesquisador/Pós-graduação', 5),
  ('PUBLIC_MANAGER', 'Gestor Público', 4),
  ('ENTREPRENEUR', 'Empresário', 3),
  ('CONSULTANT', 'Consultor', 4),
  ('INSTITUTIONAL_ADMIN', 'Administrador Institucional', 5),
  ('PLATFORM_ADMIN', 'Administrador da Plataforma', 5)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(role_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_uid);

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );
```

---

### Schema 2: Conteúdo Autoral (Mario Beni)

```sql
-- ==========================================
-- CONTEÚDO AUTORAL (BASE EPISTEMOLÓGICA)
-- ==========================================

CREATE TABLE IF NOT EXISTS content_items (
  content_id TEXT PRIMARY KEY, -- ex: MB-000123
  author TEXT NOT NULL DEFAULT 'Mario Carlos Beni',

  -- Tipo de conteúdo
  content_type TEXT NOT NULL CHECK (content_type IN (
    'BOOK',
    'BOOK_CHAPTER',
    'ARTICLE',
    'LIVE',
    'LECTURE',
    'SPEECH',
    'VIDEO',
    'INTERVIEW',
    'THESIS'
  )),

  title TEXT NOT NULL,
  subtitle TEXT,

  -- Metadados bibliográficos
  publication_year INTEGER,
  publisher TEXT,
  isbn TEXT,
  doi TEXT,
  source_uri TEXT, -- arquivo/url

  -- Conteúdo
  transcript_text TEXT,
  summary TEXT,
  abstract TEXT,

  -- Organização SISTUR
  primary_pillar TEXT NOT NULL CHECK (primary_pillar IN ('RA', 'OE', 'AO')),
  secondary_pillar TEXT CHECK (secondary_pillar IN ('RA', 'OE', 'AO')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),

  -- Versionamento
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'published', 'archived')),

  -- Taxonomia
  topics TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  key_concepts JSONB DEFAULT '{}',

  -- Auditoria
  created_by UUID REFERENCES users(user_id),
  validated_by UUID REFERENCES users(user_id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_items_pillar ON content_items(primary_pillar);
CREATE INDEX idx_content_items_level ON content_items(level);
CREATE INDEX idx_content_items_type ON content_items(content_type);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_topics ON content_items USING gin(topics);
CREATE INDEX idx_content_items_keywords ON content_items USING gin(keywords);

-- Full-text search em português
CREATE INDEX idx_content_items_search ON content_items
  USING gin(to_tsvector('portuguese',
    title || ' ' || COALESCE(abstract, '') || ' ' || COALESCE(summary, '')
  ));

-- Tags para organização adicional
CREATE TABLE IF NOT EXISTS content_tags (
  tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_item_tags (
  content_id TEXT REFERENCES content_items(content_id) ON DELETE CASCADE,
  tag_id UUID REFERENCES content_tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

-- RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published content"
  ON content_items FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage all content"
  ON content_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.role_id = ur.role_id
      WHERE ur.user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
        AND r.name IN ('PLATFORM_ADMIN', 'INSTITUTIONAL_ADMIN')
    )
  );

-- ==========================================
-- SEED DATA: Principais Obras de Mario Beni
-- ==========================================

INSERT INTO content_items (
  content_id,
  content_type,
  title,
  subtitle,
  publication_year,
  publisher,
  isbn,
  primary_pillar,
  secondary_pillar,
  level,
  topics,
  keywords,
  abstract,
  summary,
  key_concepts,
  status
) VALUES
(
  'MB-001',
  'BOOK',
  'Análise Estrutural do Turismo',
  NULL,
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'OE',
  NULL,
  4,
  ARRAY['teoria sistêmica', 'SISTUR', 'análise estrutural', 'metodologia'],
  ARRAY['turismo', 'sistema', 'SISTUR', 'estrutural', 'holístico'],
  'Obra fundamental que apresenta o modelo SISTUR (Sistema de Turismo) e a teoria sistêmica aplicada ao turismo. Revolucionou os estudos turísticos no Brasil ao propor uma abordagem holística e interdisciplinar.',
  'Este livro é a base teórica do SISTUR. Beni apresenta o turismo como um sistema aberto, dividido em três conjuntos interdependentes: RA (Relações Ambientais), OE (Organização Estrutural) e AO (Ações Operacionais). A obra estabelece princípios sistêmicos que regem o desenvolvimento turístico sustentável.',
  '{
    "sistur_model": "Sistema aberto com três conjuntos interdependentes",
    "ra_primacy": "Meio ambiente como base fundamental do turismo",
    "oe_dependency": "Infraestrutura depende de ambiente saudável",
    "ao_subordination": "Operação subordinada a RA e OE",
    "holistic_approach": "Visão holística e interdisciplinar",
    "systems_theory": "Aplicação da Teoria Geral dos Sistemas",
    "sustainable_development": "Sustentabilidade como princípio norteador"
  }'::jsonb,
  'published'
),
(
  'MB-002',
  'BOOK_CHAPTER',
  'O Conjunto das Relações Ambientais',
  'Capítulo de Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'RA',
  NULL,
  4,
  ARRAY['meio ambiente', 'sustentabilidade', 'patrimônio cultural', 'comunidade', 'capacidade de carga'],
  ARRAY['RA', 'ambiente', 'ecologia', 'cultura', 'social'],
  'Capítulo fundamental que detalha o primeiro conjunto do SISTUR: as Relações Ambientais (RA).',
  'Beni explica que o turismo depende fundamentalmente do meio ambiente natural e cultural. O RA constitui a base de todo sistema turístico - sem recursos ambientais preservados e patrimônio cultural valorizado, não há turismo sustentável. Este conjunto engloba subsistemas ecológico, social, econômico e cultural. A capacidade de carga é conceito central.',
  '{
    "environmental_foundation": "RA é a base essencial do sistema turístico",
    "subsystems": ["ecológico", "social", "econômico", "cultural"],
    "natural_resources": "Recursos naturais como atrativos turísticos",
    "cultural_heritage": "Patrimônio material e imaterial",
    "carrying_capacity": "Capacidade de carga ambiental e social",
    "sustainability_principle": "Sustentabilidade como imperativo ético",
    "community_integration": "Comunidade local parte integral do sistema",
    "environmental_impact": "Avaliação de impactos ambientais obrigatória"
  }'::jsonb,
  'published'
),
(
  'MB-003',
  'BOOK_CHAPTER',
  'O Conjunto da Organização Estrutural',
  'Capítulo de Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'OE',
  'AO',
  4,
  ARRAY['infraestrutura', 'superestrutura', 'governança', 'planejamento', 'políticas públicas'],
  ARRAY['OE', 'infraestrutura', 'equipamentos', 'governança', 'instituições'],
  'Capítulo dedicado ao segundo conjunto do SISTUR: a Organização Estrutural (OE).',
  'Detalha a infraestrutura turística (meios de hospedagem, transportes, equipamentos, serviços) e a superestrutura (órgãos públicos de turismo, legislação, políticas públicas, planejamento). Beni enfatiza que OE só funciona adequadamente quando RA está preservado. A governança institucional é elemento crítico.',
  '{
    "infrastructure": "Base física: hotéis, transportes, equipamentos, serviços",
    "superstructure": "Base institucional: órgãos, leis, políticas, planejamento",
    "integrated_planning": "Planejamento integrado e participativo",
    "public_governance": "Governança pública do turismo",
    "dependency_on_ra": "OE só funciona se RA estiver saudável",
    "investment_criteria": "Investimentos devem respeitar capacidade ambiental",
    "territorial_regulation": "Regulação e ordenamento territorial",
    "institutional_capacity": "Capacidade institucional de gestão"
  }'::jsonb,
  'published'
),
(
  'MB-004',
  'BOOK_CHAPTER',
  'O Conjunto das Ações Operacionais',
  'Capítulo de Análise Estrutural do Turismo',
  2001,
  'Editora Senac São Paulo',
  '9788573592344',
  'AO',
  NULL,
  3,
  ARRAY['operação turística', 'marketing', 'comercialização', 'distribuição', 'experiência'],
  ARRAY['AO', 'operação', 'marketing', 'agências', 'tour operators'],
  'Capítulo sobre o terceiro conjunto do SISTUR: as Ações Operacionais (AO).',
  'Aborda comercialização, distribuição, marketing e operação dos produtos turísticos. É o conjunto mais visível para o turista. Beni ressalta que AO só pode funcionar adequadamente se RA e OE estiverem em ordem. Marketing não pode compensar deficiências estruturais ou ambientais.',
  '{
    "commercialization": "Comercialização de produtos e serviços",
    "distribution": "Distribuição via agências e operadoras",
    "marketing_promotion": "Marketing e promoção de destinos",
    "service_operation": "Operação e execução de serviços",
    "tourist_experience": "Entrega da experiência ao visitante",
    "subordination": "AO subordinado a RA e OE - não compensa deficiências",
    "supply_demand": "Relação entre oferta e demanda turística",
    "quality_assurance": "Garantia de qualidade na operação"
  }'::jsonb,
  'published'
),
(
  'MB-005',
  'ARTICLE',
  'Turismo: Da Economia de Serviços à Economia da Experiência',
  NULL,
  2003,
  'Revista Turismo em Análise',
  NULL,
  'AO',
  'OE',
  4,
  ARRAY['economia da experiência', 'serviços turísticos', 'qualidade', 'memorabilidade'],
  ARRAY['experiência', 'qualidade', 'autenticidade', 'memorabilidade'],
  'Artigo que analisa a evolução do turismo da economia de serviços para a economia da experiência.',
  'Beni discute como o turismo evoluiu de uma indústria focada em serviços padronizados para uma economia baseada em experiências memoráveis e transformadoras. Enfatiza a importância da qualidade, autenticidade, personalização e co-criação de valor.',
  '{
    "experience_economy": "Turismo como economia da experiência",
    "memorable_experiences": "Experiências memoráveis e transformadoras",
    "authenticity": "Autenticidade como valor fundamental",
    "total_quality": "Qualidade total nos serviços turísticos",
    "personalization": "Personalização e customização",
    "value_cocreation": "Co-criação de valor com o turista"
  }'::jsonb,
  'published'
),
(
  'MB-006',
  'LECTURE',
  'Planejamento Estratégico de Destinos Turísticos',
  'Palestra sobre metodologia SISTUR aplicada',
  2010,
  NULL,
  NULL,
  'OE',
  'RA',
  5,
  ARRAY['planejamento estratégico', 'destinos turísticos', 'diagnóstico sistêmico', 'desenvolvimento sustentável'],
  ARRAY['planejamento', 'estratégia', 'diagnóstico', 'participação'],
  'Palestra sobre metodologia de planejamento estratégico de destinos turísticos baseada no modelo SISTUR.',
  'Beni apresenta metodologia de planejamento que integra os três conjuntos do SISTUR. Enfatiza a necessidade de diagnóstico sistêmico prévio a qualquer intervenção. Planejamento deve ser participativo, envolvendo todos stakeholders. Monitoramento contínuo é essencial.',
  '{
    "systemic_diagnosis": "Diagnóstico sistêmico dos três conjuntos (RA, OE, AO)",
    "strategic_planning": "Planejamento estratégico participativo",
    "stakeholder_engagement": "Envolvimento de todos os atores sociais",
    "integrated_approach": "Abordagem integrada e holística",
    "continuous_monitoring": "Monitoramento contínuo e avaliação",
    "adaptive_management": "Gestão adaptativa baseada em resultados"
  }'::jsonb,
  'published'
);
```

---

### Schema 3: Cursos, Módulos e Trilhas

```sql
-- ==========================================
-- CURSOS
-- ==========================================

CREATE TABLE IF NOT EXISTS courses (
  course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  -- Organização SISTUR
  primary_pillar TEXT NOT NULL CHECK (primary_pillar IN ('RA', 'OE', 'AO')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),

  -- Versionamento
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Metadados
  workload_minutes INTEGER,
  prerequisite_text TEXT,
  learning_objectives TEXT[],

  -- Auditoria
  created_by UUID REFERENCES users(user_id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(course_id, version)
);

CREATE INDEX idx_courses_pillar ON courses(primary_pillar);
CREATE INDEX idx_courses_level ON courses(level);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_tenant ON courses(tenant_id);

-- Relacionamento curso → conteúdo autoral (auditoria)
CREATE TABLE IF NOT EXISTS course_content_sources (
  course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content_items(content_id) ON DELETE RESTRICT,
  usage_type TEXT CHECK (usage_type IN ('primary', 'supplementary', 'reference')),
  PRIMARY KEY (course_id, content_id)
);

-- ==========================================
-- MÓDULOS
-- ==========================================

CREATE TABLE IF NOT EXISTS modules (
  module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_modules_order ON modules(course_id, order_index);

-- ==========================================
-- AULAS
-- ==========================================

CREATE TABLE IF NOT EXISTS lessons (
  lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(module_id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,

  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('video', 'text', 'interactive', 'quiz')),
  estimated_minutes INTEGER,

  -- Conteúdo da aula
  video_url TEXT,
  content_text TEXT,
  slides_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lessons_order ON lessons(module_id, order_index);

-- Relacionamento aula → conteúdo autoral (auditoria forte)
CREATE TABLE IF NOT EXISTS lesson_content_sources (
  lesson_id UUID REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content_items(content_id) ON DELETE RESTRICT,
  source_locator TEXT, -- ex: "página 45-52", "timestamp 12:30-15:45"
  citation_text TEXT,
  PRIMARY KEY (lesson_id, content_id, source_locator)
);

-- ==========================================
-- TRILHAS
-- ==========================================

CREATE TABLE IF NOT EXISTS tracks (
  track_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  pillar_scope TEXT NOT NULL CHECK (pillar_scope IN ('RA', 'OE', 'AO', 'INTEGRATED')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),

  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),

  total_workload_minutes INTEGER,

  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracks_pillar ON tracks(pillar_scope);
CREATE INDEX idx_tracks_level ON tracks(level);
CREATE INDEX idx_tracks_tenant ON tracks(tenant_id);

-- Trilha → Cursos (N:N com ordem)
CREATE TABLE IF NOT EXISTS track_courses (
  track_id UUID REFERENCES tracks(track_id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  PRIMARY KEY (track_id, course_id)
);

CREATE INDEX idx_track_courses_track ON track_courses(track_id, order_index);

-- Pré-requisitos entre cursos
CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
  required_course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, required_course_id),
  CHECK (course_id != required_course_id)
);

-- RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published courses"
  ON courses FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public can view published tracks"
  ON tracks FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.role_id = ur.role_id
      WHERE ur.user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
        AND r.name IN ('PLATFORM_ADMIN', 'INSTITUTIONAL_ADMIN')
    )
  );
```

---

### Schema 4: Progresso do Aluno

```sql
-- ==========================================
-- MATRÍCULAS
-- ==========================================

CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
  course_version INTEGER NOT NULL,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'suspended')),

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,

  progress_pct DECIMAL(5,2) DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, course_id),
  FOREIGN KEY (course_id, course_version) REFERENCES courses(course_id, version)
);

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- ==========================================
-- PROGRESSO POR AULA
-- ==========================================

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(lesson_id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_pct DECIMAL(5,2) DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),

  time_spent_minutes INTEGER DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,

  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrollments"
  ON enrollments FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "Users can insert their own enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "Users can view their own progress"
  ON lesson_progress FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "Users can update their own progress"
  ON lesson_progress FOR ALL
  USING (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );
```

---

### Schema 5: Quizzes e Banco de Questões

```sql
-- ==========================================
-- BANCO DE QUESTÕES (QUIZZES)
-- ==========================================

CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origem
  origin TEXT NOT NULL CHECK (origin IN ('existing', 'generated', 'imported')),

  -- Classificação SISTUR
  pillar TEXT NOT NULL CHECK (pillar IN ('RA', 'OE', 'AO')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  theme TEXT,

  -- Tipo de questão
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),

  -- Conteúdo da questão
  stem TEXT NOT NULL, -- enunciado
  explanation TEXT, -- explicação da resposta

  -- Metadados
  difficulty DECIMAL(3,2) CHECK (difficulty BETWEEN 0 AND 1), -- 0=fácil, 1=difícil
  discrimination_index DECIMAL(3,2), -- índice de discriminação (psicometria)

  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES users(user_id),
  validated_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_pillar ON quiz_questions(pillar);
CREATE INDEX idx_quiz_questions_level ON quiz_questions(level);
CREATE INDEX idx_quiz_questions_active ON quiz_questions(is_active);
CREATE INDEX idx_quiz_questions_origin ON quiz_questions(origin);

-- ==========================================
-- ALTERNATIVAS DAS QUESTÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS quiz_options (
  option_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quiz_questions(quiz_id) ON DELETE CASCADE,

  option_label TEXT NOT NULL, -- A, B, C, D, E
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_options_quiz ON quiz_options(quiz_id);

-- Garantir que cada questão tem apenas 1 resposta correta
CREATE UNIQUE INDEX idx_quiz_options_correct ON quiz_options(quiz_id)
  WHERE is_correct = true AND quiz_id IS NOT NULL;

-- ==========================================
-- AUDITORIA: QUIZ → CONTEÚDO AUTORAL
-- ==========================================

CREATE TABLE IF NOT EXISTS quiz_content_sources (
  quiz_id UUID REFERENCES quiz_questions(quiz_id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content_items(content_id) ON DELETE RESTRICT,
  source_locator TEXT, -- página, timestamp, capítulo
  PRIMARY KEY (quiz_id, content_id, source_locator)
);

-- ==========================================
-- HISTÓRICO DE USO (ANTI-REPETIÇÃO)
-- ==========================================

CREATE TABLE IF NOT EXISTS quiz_usage_history (
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quiz_questions(quiz_id) ON DELETE CASCADE,

  last_used_at TIMESTAMPTZ NOT NULL,
  times_used INTEGER NOT NULL DEFAULT 1,

  PRIMARY KEY (user_id, quiz_id)
);

CREATE INDEX idx_quiz_usage_user ON quiz_usage_history(user_id);
CREATE INDEX idx_quiz_usage_quiz ON quiz_usage_history(quiz_id);
CREATE INDEX idx_quiz_usage_last_used ON quiz_usage_history(last_used_at);

-- RLS
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active quizzes are viewable by authenticated users"
  ON quiz_questions FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Quiz options viewable with quiz"
  ON quiz_options FOR SELECT
  USING (
    quiz_id IN (SELECT quiz_id FROM quiz_questions WHERE is_active = true)
  );
```

---

### Schema 6: Provas Dinâmicas (Anti-Cola)

```sql
-- ==========================================
-- REGRAS DE CONFIGURAÇÃO DE PROVAS
-- ==========================================

CREATE TABLE IF NOT EXISTS exam_rulesets (
  ruleset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,

  -- Configurações da prova
  min_score_pct DECIMAL(5,2) NOT NULL CHECK (min_score_pct BETWEEN 0 AND 100),
  time_limit_minutes INTEGER NOT NULL,
  question_count INTEGER NOT NULL,

  -- Mix de pilares (se curso é integrado)
  pillar_mix JSONB, -- ex: {"RA": 40, "OE": 30, "AO": 30}

  -- Retentativa
  allow_retake BOOLEAN DEFAULT true,
  retake_wait_hours INTEGER DEFAULT 24,
  max_attempts INTEGER DEFAULT 3,

  -- Anti-repetição
  min_days_between_same_quiz INTEGER DEFAULT 30,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(course_id)
);

-- ==========================================
-- PROVAS GERADAS
-- ==========================================

CREATE TABLE IF NOT EXISTS exams (
  exam_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
  course_version INTEGER NOT NULL,
  ruleset_id UUID REFERENCES exam_rulesets(ruleset_id),

  -- Composição única (hash para evitar duplicação)
  composition_hash TEXT NOT NULL,
  question_ids UUID[] NOT NULL, -- array ordenado dos quiz_ids

  -- Status da prova
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN (
    'generated',
    'started',
    'submitted',
    'expired',
    'voided'
  )),

  -- Datas
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,

  UNIQUE(composition_hash), -- garante unicidade da composição
  FOREIGN KEY (course_id, course_version) REFERENCES courses(course_id, version)
);

CREATE INDEX idx_exams_user ON exams(user_id);
CREATE INDEX idx_exams_course ON exams(course_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_hash ON exams(composition_hash);

-- ==========================================
-- QUESTÕES DA PROVA (com randomização)
-- ==========================================

CREATE TABLE IF NOT EXISTS exam_questions (
  exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quiz_questions(quiz_id) ON DELETE CASCADE,

  display_order INTEGER NOT NULL,
  options_shuffle_seed INTEGER, -- seed para randomizar alternativas

  PRIMARY KEY (exam_id, quiz_id)
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id, display_order);

-- ==========================================
-- TENTATIVAS DE PROVA
-- ==========================================

CREATE TABLE IF NOT EXISTS exam_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,

  -- Resultado
  score_pct DECIMAL(5,2),
  result TEXT CHECK (result IN ('passed', 'failed', 'pending')),

  -- Modo de correção
  grading_mode TEXT DEFAULT 'automatic' CHECK (grading_mode IN ('automatic', 'hybrid', 'manual')),

  -- Auditoria
  ip_address INET,
  user_agent TEXT,
  audit_trail_ref TEXT, -- referência externa se necessário

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_result ON exam_attempts(result);

-- ==========================================
-- RESPOSTAS DO ALUNO
-- ==========================================

CREATE TABLE IF NOT EXISTS exam_answers (
  attempt_id UUID REFERENCES exam_attempts(attempt_id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quiz_questions(quiz_id) ON DELETE CASCADE,

  selected_option_id UUID REFERENCES quiz_options(option_id),
  free_text_answer TEXT, -- para questões discursivas

  is_correct BOOLEAN,
  awarded_points DECIMAL(5,2) DEFAULT 0,

  answered_at TIMESTAMPTZ,

  PRIMARY KEY (attempt_id, quiz_id)
);

CREATE INDEX idx_exam_answers_attempt ON exam_answers(attempt_id);

-- RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exams"
  ON exams FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "Users can view their own attempts"
  ON exam_attempts FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "Users can submit their own answers"
  ON exam_answers FOR ALL
  USING (
    attempt_id IN (
      SELECT attempt_id FROM exam_attempts
      WHERE user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
    )
  );
```

---

### Schema 7: Certificados

```sql
-- ==========================================
-- CERTIFICADOS
-- ==========================================

CREATE TABLE IF NOT EXISTS certificates (
  certificate_id TEXT PRIMARY KEY, -- ex: CERT-2026-000001
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
  course_version INTEGER NOT NULL,
  attempt_id UUID REFERENCES exam_attempts(attempt_id) ON DELETE RESTRICT,

  -- Dados do certificado
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workload_minutes INTEGER NOT NULL,
  pillar_scope TEXT NOT NULL,

  -- Verificação
  verification_code TEXT NOT NULL UNIQUE,
  qr_verify_url TEXT,

  -- Arquivo PDF
  pdf_uri TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  FOREIGN KEY (course_id, course_version) REFERENCES courses(course_id, version)
);

CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_course ON certificates(course_id);
CREATE INDEX idx_certificates_verification ON certificates(verification_code);
CREATE INDEX idx_certificates_issued ON certificates(issued_at DESC);

-- Função para gerar ID único de certificado
CREATE OR REPLACE FUNCTION generate_certificate_id()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Busca próximo número sequencial do ano
  SELECT LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO sequence_part
  FROM certificates
  WHERE certificate_id LIKE 'CERT-' || year_part || '-%';

  RETURN 'CERT-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates"
  ON certificates FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "Anyone can verify certificates"
  ON certificates FOR SELECT
  USING (
    status = 'active'
  );
```

---

### Schema 8: Motor On-Demand

```sql
-- ==========================================
-- SOLICITAÇÕES ON-DEMAND
-- ==========================================

CREATE TABLE IF NOT EXISTS ondemand_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(tenant_id),

  -- Tipo de necessidade
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'course',           -- Curso completo
    'track',            -- Trilha de aprendizado
    'lesson_plan',      -- Plano de aula
    'tcc_outline',      -- Estrutura de TCC
    'thesis_outline',   -- Estrutura de tese
    'training_plan'     -- Plano de capacitação
  )),

  -- Contexto
  context_type TEXT CHECK (context_type IN ('academic', 'institutional', 'professional')),

  -- Preferências
  desired_pillar TEXT CHECK (desired_pillar IN ('RA', 'OE', 'AO', 'INTEGRATED')),
  desired_level INTEGER CHECK (desired_level BETWEEN 1 AND 5),

  -- Texto livre do usuário
  topic_text TEXT NOT NULL,
  additional_context TEXT,
  specific_topics TEXT[],
  learning_goals TEXT[],

  -- Status
  status TEXT DEFAULT 'received' CHECK (status IN (
    'received',
    'validated',
    'generating',
    'generated',
    'rejected',
    'failed'
  )),

  -- Metadados
  processing_time_seconds INTEGER,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ondemand_requests_user ON ondemand_requests(user_id);
CREATE INDEX idx_ondemand_requests_status ON ondemand_requests(status);
CREATE INDEX idx_ondemand_requests_created ON ondemand_requests(created_at DESC);

-- ==========================================
-- SAÍDAS GERADAS (RESULTADOS)
-- ==========================================

CREATE TABLE IF NOT EXISTS ondemand_outputs (
  output_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES ondemand_requests(request_id) ON DELETE CASCADE,

  output_type TEXT NOT NULL CHECK (output_type IN (
    'track_instance',
    'course_instance',
    'lesson_plan',
    'tcc_outline',
    'thesis_outline',
    'training_plan'
  )),

  title TEXT NOT NULL,
  description TEXT,

  -- Payload estruturado
  payload JSONB NOT NULL,

  -- Arquivo gerado (PDF, HTML, etc.)
  file_uri TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ondemand_outputs_request ON ondemand_outputs(request_id);

-- ==========================================
-- AUDITORIA: FONTES USADAS NA GERAÇÃO
-- ==========================================

CREATE TABLE IF NOT EXISTS ondemand_output_sources (
  output_id UUID REFERENCES ondemand_outputs(output_id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content_items(content_id) ON DELETE RESTRICT,
  source_locator TEXT,
  usage_context TEXT, -- em qual parte do output foi usado
  PRIMARY KEY (output_id, content_id, source_locator)
);

-- ==========================================
-- TRILHAS INSTANCIADAS (NAVEGÁVEIS)
-- ==========================================

CREATE TABLE IF NOT EXISTS track_instances (
  track_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES ondemand_requests(request_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  pillar_scope TEXT NOT NULL,
  level INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS track_instance_items (
  track_instance_id UUID REFERENCES track_instances(track_instance_id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('course', 'module', 'lesson')),
  item_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (track_instance_id, item_type, item_id)
);

CREATE INDEX idx_track_instance_items_track ON track_instance_items(track_instance_id, order_index);

-- RLS
ALTER TABLE ondemand_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ondemand_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ondemand requests"
  ON ondemand_requests FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "Users can create ondemand requests"
  ON ondemand_requests FOR INSERT
  WITH CHECK (
    user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "Users can view their own outputs"
  ON ondemand_outputs FOR SELECT
  USING (
    request_id IN (
      SELECT request_id FROM ondemand_requests
      WHERE user_id IN (SELECT user_id FROM users WHERE auth_uid = auth.uid())
    )
  );
```

---

### Schema 9: Integração SISTUR ERP

```sql
-- ==========================================
-- DIAGNÓSTICOS DO ERP
-- ==========================================

CREATE TABLE IF NOT EXISTS erp_diagnostics (
  diagnostic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id),

  entity_ref TEXT NOT NULL, -- município, órgão, empresa
  entity_type TEXT CHECK (entity_type IN ('municipality', 'government', 'company')),

  -- Resultado do diagnóstico
  pillar_priority TEXT CHECK (pillar_priority IN ('RA', 'OE', 'AO')),
  indicators_data JSONB, -- dados dos indicadores

  -- IGMA warnings
  igma_warnings JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erp_diagnostics_tenant ON erp_diagnostics(tenant_id);
CREATE INDEX idx_erp_diagnostics_created ON erp_diagnostics(created_at DESC);

-- ==========================================
-- PRESCRIÇÕES DE APRENDIZAGEM (ERP → EDU)
-- ==========================================

CREATE TABLE IF NOT EXISTS learning_prescriptions (
  prescription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id UUID REFERENCES erp_diagnostics(diagnostic_id) ON DELETE CASCADE,

  recommended_track_id UUID REFERENCES tracks(track_id),
  recommended_courses JSONB, -- array de course_ids
  target_roles JSONB, -- quais perfis devem fazer

  reasoning TEXT, -- justificativa da prescrição

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_prescriptions_diagnostic ON learning_prescriptions(diagnostic_id);

-- ==========================================
-- LOG DE EVENTOS (ERP ↔ EDU)
-- ==========================================

CREATE TABLE IF NOT EXISTS erp_event_log (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id),

  event_type TEXT NOT NULL CHECK (event_type IN (
    'diagnostic_received',
    'prescription_sent',
    'certification_status_sent',
    'progress_update_sent'
  )),

  payload JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erp_event_log_tenant ON erp_event_log(tenant_id);
CREATE INDEX idx_erp_event_log_type ON erp_event_log(event_type);
CREATE INDEX idx_erp_event_log_created ON erp_event_log(created_at DESC);
```

---

### Schema 10: Auditoria e Logs

```sql
-- ==========================================
-- AUDIT LOG (IMUTÁVEL - PARA GOVERNO)
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id),
  user_id UUID REFERENCES users(user_id),

  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,

  -- Detalhes
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,

  -- Contexto
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Particionamento por mês (para performance em alta escala)
-- CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Garantir que logs são append-only (sem UPDATE/DELETE)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Função helper para criar audit logs
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Pega user_id do contexto atual
  SELECT user_id, tenant_id INTO v_user_id, v_tenant_id
  FROM users WHERE auth_uid = auth.uid();

  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata,
    ip_address
  ) VALUES (
    v_tenant_id,
    v_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_metadata,
    inet_client_addr()
  )
  RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎓 PARTE 2: PERFIS DE USUÁRIO E NÍVEIS

### Perfis (RBAC)

| Perfil | Max Level | Descrição | Certificações |
|--------|-----------|-----------|---------------|
| **STUDENT** | 3 | Estudante de graduação/técnico | Básico, Intermediário |
| **TEACHER** | 4 | Professor de turismo | Todas exceto especialização |
| **RESEARCHER** | 5 | Pós-graduação, mestrado, doutorado | Todas incluindo especialização |
| **PUBLIC_MANAGER** | 4 | Gestor público de turismo | Focadas em gestão |
| **ENTREPRENEUR** | 3 | Empresário setor privado | Focadas em operação |
| **CONSULTANT** | 4 | Consultor técnico | Técnicas e estratégicas |
| **INSTITUTIONAL_ADMIN** | 5 | Admin do tenant | Todas + gestão institucional |
| **PLATFORM_ADMIN** | 5 | Admin da plataforma | Acesso total |

### Níveis de Conteúdo

| Nível | Nome | Descrição | Público |
|-------|------|-----------|---------|
| **1** | Introdutório | Conceitos básicos, linguagem simples | Iniciantes, público geral |
| **2** | Básico | Fundamentos SISTUR, aplicação inicial | Estudantes, técnicos |
| **3** | Intermediário | Aplicação prática, casos reais | Graduação, gestores |
| **4** | Avançado | Análise complexa, diagnóstico | Pós-graduação, consultores |
| **5** | Especialização | Pesquisa, desenvolvimento teórico | Doutorado, pesquisadores |

---

## ⚙️ PARTE 3: MOTOR ON-DEMAND (CORE DO SISTEMA)

### 3.1 Fluxo Completo

```
1. USUÁRIO DECLARA NECESSIDADE
   ↓
   "Quero aprender sobre planejamento turístico sustentável
    para aplicar no meu município"
   ↓
2. SISTEMA IDENTIFICA
   - Perfil: PUBLIC_MANAGER (max_level: 4)
   - Objetivo: aplicação prática (training_plan)
   - Contexto: institucional
   - Pilar predominante: OE + RA
   - Nível recomendado: 3-4
   ↓
3. BUSCA CONTEÚDO COMPATÍVEL
   SELECT * FROM content_items
   WHERE primary_pillar IN ('OE', 'RA')
     AND level BETWEEN 3 AND 4
     AND status = 'published'
     AND topics && ARRAY['planejamento', 'sustentabilidade']
   ↓
4. MONTA TRILHA AUTOMATICAMENTE
   - Módulo 1: Fundamentos SISTUR (RA)
   - Módulo 2: Planejamento Territorial (OE)
   - Módulo 3: Sustentabilidade Aplicada (RA+OE)
   - Módulo 4: Casos Práticos
   ↓
5. REGISTRA FONTES USADAS
   INSERT INTO ondemand_output_sources
   (todas as CONTENT_ITEM.content_id usadas)
   ↓
6. ENTREGA TRILHA NAVEGÁVEL
   track_instance criado
   ↓
7. USUÁRIO ESTUDA E FAZ PROVA
   ↓
8. CERTIFICAÇÃO AUTOMÁTICA
```

### 3.2 Lógica de Seleção de Conteúdo

```typescript
// Pseudocódigo do algoritmo
function selectContentForOnDemand(request: OnDemandRequest) {
  // 1. Identifica nível do usuário
  const userMaxLevel = getUserMaxLevel(request.user_id);
  const targetLevel = Math.min(request.desired_level, userMaxLevel);

  // 2. Identifica pilares
  const pillars = request.desired_pillar === 'INTEGRATED'
    ? ['RA', 'OE', 'AO']
    : [request.desired_pillar];

  // 3. Busca conteúdo compatível
  const compatibleContent = db.query(`
    SELECT * FROM content_items
    WHERE primary_pillar = ANY($1)
      AND level <= $2
      AND status = 'published'
      AND (
        topics && $3  -- match com tópicos solicitados
        OR keywords && $4  -- ou keywords
      )
    ORDER BY
      CASE WHEN level = $2 THEN 0 ELSE ABS(level - $2) END,
      publication_year DESC
  `, [pillars, targetLevel, request.specific_topics, extractKeywords(request.topic_text)]);

  // 4. Agrupa por tema/módulo
  const modules = groupByTheme(compatibleContent);

  // 5. Monta estrutura didática
  const track = {
    title: generateTitle(request),
    modules: modules.map(buildModule),
    pillar_scope: request.desired_pillar,
    level: targetLevel
  };

  // 6. Valida completude
  if (!hasMinimumContent(track)) {
    throw new Error('Conteúdo insuficiente para gerar trilha');
  }

  return track;
}
```

### 3.3 Casos de Uso Específicos

#### Caso 1: Plano de Aula (Professor)

**Input**:
```json
{
  "goal_type": "lesson_plan",
  "topic_text": "Ensinar SISTUR para alunos de ensino médio",
  "context_type": "academic",
  "desired_level": 1,
  "desired_pillar": "INTEGRATED"
}
```

**Output**:
```json
{
  "output_type": "lesson_plan",
  "title": "Plano de Aula: Introdução ao SISTUR",
  "payload": {
    "target_audience": "Ensino médio",
    "duration": "2 aulas de 50 minutos",
    "objectives": [
      "Compreender o conceito de sistema aplicado ao turismo",
      "Identificar os três pilares do SISTUR",
      "Reconhecer a importância da sustentabilidade"
    ],
    "content": {
      "introduction": "...",
      "development": {
        "pillar_ra": "...",
        "pillar_oe": "...",
        "pillar_ao": "..."
      },
      "activities": [...],
      "assessment": "..."
    },
    "resources": [
      "Slides baseados em MB-001",
      "Vídeo: palestra Mario Beni (MB-006)"
    ],
    "references": [
      "BENI, Mario Carlos. Análise Estrutural do Turismo. São Paulo: Senac, 2001."
    ]
  },
  "sources_used": ["MB-001", "MB-002", "MB-006"]
}
```

#### Caso 2: Estrutura de TCC (Estudante)

**Input**:
```json
{
  "goal_type": "tcc_outline",
  "topic_text": "Desenvolvimento sustentável de destinos turísticos costeiros",
  "context_type": "academic",
  "desired_level": 3,
  "desired_pillar": "RA"
}
```

**Output**:
```json
{
  "output_type": "tcc_outline",
  "title": "TCC: Desenvolvimento Sustentável de Destinos Costeiros - Aplicação do SISTUR",
  "payload": {
    "chapters": [
      {
        "number": 1,
        "title": "Introdução",
        "sections": [
          "1.1 Justificativa",
          "1.2 Objetivos",
          "1.3 Metodologia"
        ]
      },
      {
        "number": 2,
        "title": "Fundamentação Teórica: O Modelo SISTUR",
        "sections": [
          "2.1 Teoria Sistêmica aplicada ao Turismo",
          "2.2 O Conjunto das Relações Ambientais (RA)",
          "2.3 Sustentabilidade em Destinos Costeiros"
        ],
        "key_references": ["MB-001", "MB-002"]
      },
      {
        "number": 3,
        "title": "Estudo de Caso",
        "sections": [
          "3.1 Caracterização do Destino",
          "3.2 Diagnóstico RA",
          "3.3 Análise de Impactos"
        ]
      },
      {
        "number": 4,
        "title": "Proposta de Desenvolvimento Sustentável",
        "sections": [
          "4.1 Diretrizes RA",
          "4.2 Capacidade de Carga",
          "4.3 Plano de Ação"
        ]
      },
      {
        "number": 5,
        "title": "Considerações Finais"
      }
    ],
    "bibliography": [
      "BENI, Mario Carlos. Análise Estrutural do Turismo. São Paulo: Senac, 2001.",
      "BENI, Mario Carlos. O Conjunto das Relações Ambientais. In: Análise Estrutural..."
    ],
    "methodological_guidance": "Pesquisa aplicada com estudo de caso único..."
  },
  "sources_used": ["MB-001", "MB-002", "MB-003"]
}
```

---

## 🎲 PARTE 4: SISTEMA DE AVALIAÇÃO ANTI-COLA

### 4.1 Princípios

1. **Cada prova é única** (composição diferente)
2. **Randomização multi-nível**:
   - Seleção de questões
   - Ordem das questões
   - Ordem das alternativas
3. **Anti-repetição inteligente**: aluno não vê mesma questão em menos de X dias
4. **Hash de composição**: detecta tentativas de duplicação

### 4.2 Algoritmo de Geração de Prova

```typescript
async function generateExam(userId: string, courseId: string) {
  // 1. Busca regras da prova
  const ruleset = await getExamRuleset(courseId);

  // 2. Busca histórico de quizzes usados pelo aluno
  const usedQuizzes = await db.query(`
    SELECT quiz_id, last_used_at, times_used
    FROM quiz_usage_history
    WHERE user_id = $1
  `, [userId]);

  const excludeQuizIds = usedQuizzes
    .filter(q => {
      const daysSinceUse = daysBetween(q.last_used_at, now());
      return daysSinceUse < ruleset.min_days_between_same_quiz;
    })
    .map(q => q.quiz_id);

  // 3. Busca pool de questões compatíveis
  const course = await getCourse(courseId);

  const quizPool = await db.query(`
    SELECT q.*, array_agg(o.option_id ORDER BY o.option_label) as options
    FROM quiz_questions q
    LEFT JOIN quiz_options o ON o.quiz_id = q.quiz_id
    WHERE q.pillar = $1
      AND q.level <= $2
      AND q.is_active = true
      AND q.quiz_id != ALL($3)
    GROUP BY q.quiz_id
  `, [course.primary_pillar, course.level, excludeQuizIds]);

  if (quizPool.length < ruleset.question_count) {
    throw new Error('Insufficient questions available');
  }

  // 4. Seleciona questões (estratificado por dificuldade)
  const selectedQuizzes = stratifiedSample(quizPool, ruleset.question_count, {
    easy: 0.3,    // 30% fáceis
    medium: 0.5,  // 50% médias
    hard: 0.2     // 20% difíceis
  });

  // 5. Randomiza ordem
  const shuffledQuizzes = shuffle(selectedQuizzes);

  // 6. Gera hash único da composição
  const quizIds = shuffledQuizzes.map(q => q.quiz_id).sort();
  const compositionHash = sha256(quizIds.join('-'));

  // 7. Verifica se esta composição exata já existe
  const existing = await db.query(`
    SELECT exam_id FROM exams
    WHERE composition_hash = $1
  `, [compositionHash]);

  if (existing.length > 0) {
    // Composição duplicada detectada - gera nova amostra
    return generateExam(userId, courseId); // recursão com nova seleção
  }

  // 8. Cria registro de prova
  const exam = await db.query(`
    INSERT INTO exams (
      user_id,
      course_id,
      course_version,
      ruleset_id,
      composition_hash,
      question_ids,
      expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING exam_id
  `, [
    userId,
    courseId,
    course.version,
    ruleset.ruleset_id,
    compositionHash,
    quizIds,
    addHours(now(), ruleset.time_limit_minutes / 60 + 24) // expira em 24h + tempo de prova
  ]);

  // 9. Cria registros de questões com seeds de randomização
  for (let i = 0; i < shuffledQuizzes.length; i++) {
    const quiz = shuffledQuizzes[i];
    const shuffleSeed = Math.floor(Math.random() * 1000000);

    await db.query(`
      INSERT INTO exam_questions (exam_id, quiz_id, display_order, options_shuffle_seed)
      VALUES ($1, $2, $3, $4)
    `, [exam.exam_id, quiz.quiz_id, i + 1, shuffleSeed]);
  }

  return exam.exam_id;
}
```

### 4.3 Randomização de Alternativas no Frontend

```typescript
// Quando aluno visualiza a questão
function renderQuestion(examQuestion: ExamQuestion) {
  const { quiz_id, options_shuffle_seed } = examQuestion;

  // Busca questão e alternativas
  const quiz = getQuiz(quiz_id);
  const options = getQuizOptions(quiz_id);

  // Randomiza alternativas usando seed única
  const shuffledOptions = seededShuffle(options, options_shuffle_seed);

  return (
    <Question stem={quiz.stem}>
      {shuffledOptions.map((option, index) => (
        <RadioOption key={option.option_id} value={option.option_id}>
          {String.fromCharCode(65 + index)}. {option.option_text}
        </RadioOption>
      ))}
    </Question>
  );
}

// Shuffle determinístico baseado em seed
function seededShuffle<T>(array: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// PRNG determinístico
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
```

### 4.4 Correção Automática

```typescript
async function gradeExam(attemptId: string) {
  // 1. Busca tentativa e respostas
  const attempt = await getExamAttempt(attemptId);
  const answers = await getExamAnswers(attemptId);

  let totalPoints = 0;
  let earnedPoints = 0;

  // 2. Corrige cada questão
  for (const answer of answers) {
    const quiz = await getQuiz(answer.quiz_id);
    const correctOption = await getCorrectOption(answer.quiz_id);

    const questionPoints = 100 / answers.length; // distribuição igual
    totalPoints += questionPoints;

    if (answer.selected_option_id === correctOption.option_id) {
      earnedPoints += questionPoints;

      await db.query(`
        UPDATE exam_answers
        SET is_correct = true, awarded_points = $1
        WHERE attempt_id = $2 AND quiz_id = $3
      `, [questionPoints, attemptId, answer.quiz_id]);
    } else {
      await db.query(`
        UPDATE exam_answers
        SET is_correct = false, awarded_points = 0
        WHERE attempt_id = $2 AND quiz_id = $3
      `, [attemptId, answer.quiz_id]);
    }
  }

  // 3. Calcula nota final
  const scorePct = (earnedPoints / totalPoints) * 100;

  // 4. Verifica aprovação
  const ruleset = await getExamRuleset(attempt.exam_id);
  const result = scorePct >= ruleset.min_score_pct ? 'passed' : 'failed';

  // 5. Atualiza tentativa
  await db.query(`
    UPDATE exam_attempts
    SET score_pct = $1, result = $2, submitted_at = NOW()
    WHERE attempt_id = $3
  `, [scorePct, result, attemptId]);

  // 6. Atualiza histórico de uso de quizzes
  for (const answer of answers) {
    await db.query(`
      INSERT INTO quiz_usage_history (user_id, quiz_id, last_used_at, times_used)
      VALUES ($1, $2, NOW(), 1)
      ON CONFLICT (user_id, quiz_id)
      DO UPDATE SET
        last_used_at = NOW(),
        times_used = quiz_usage_history.times_used + 1
    `, [attempt.user_id, answer.quiz_id]);
  }

  // 7. Se aprovado, gera certificado
  if (result === 'passed') {
    await generateCertificate(attemptId);
  }

  return { scorePct, result };
}
```

---

## 🎓 PARTE 5: CERTIFICAÇÃO AUTOMÁTICA

### 5.1 Geração de Certificado

```typescript
async function generateCertificate(attemptId: string) {
  const attempt = await getExamAttempt(attemptId);
  const exam = await getExam(attempt.exam_id);
  const course = await getCourse(exam.course_id);
  const user = await getUser(attempt.user_id);

  // 1. Gera ID único
  const certificateId = await db.query(`
    SELECT generate_certificate_id()
  `);

  // 2. Gera código de verificação
  const verificationCode = generateUniqueCode(16);

  // 3. Cria registro
  const cert = await db.query(`
    INSERT INTO certificates (
      certificate_id,
      user_id,
      course_id,
      course_version,
      attempt_id,
      workload_minutes,
      pillar_scope,
      verification_code,
      qr_verify_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    certificateId,
    user.user_id,
    course.course_id,
    course.version,
    attemptId,
    course.workload_minutes,
    course.primary_pillar,
    verificationCode,
    `https://sistur.edu/verify/${verificationCode}`
  ]);

  // 4. Gera PDF
  const pdfBuffer = await generateCertificatePDF({
    certificate_id: cert.certificate_id,
    student_name: user.full_name,
    course_title: course.title,
    course_version: course.version,
    workload: course.workload_minutes,
    pillar: course.primary_pillar,
    issue_date: cert.issued_at,
    verification_code: cert.verification_code,
    qr_code_url: cert.qr_verify_url
  });

  // 5. Upload PDF para storage
  const pdfUri = await uploadToStorage(pdfBuffer, `certificates/${cert.certificate_id}.pdf`);

  await db.query(`
    UPDATE certificates
    SET pdf_uri = $1, pdf_generated_at = NOW()
    WHERE certificate_id = $2
  `, [pdfUri, cert.certificate_id]);

  // 6. Registra audit log
  await createAuditLog(
    'CERTIFICATE_ISSUED',
    'certificate',
    cert.certificate_id,
    null,
    { user_id: user.user_id, course_id: course.course_id }
  );

  // 7. Notifica usuário (email)
  await sendCertificateEmail(user.email, cert);

  return cert;
}
```

### 5.2 Template de Certificado (PDF)

```typescript
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  // Header
  doc.fontSize(24).font('Helvetica-Bold')
     .text('CERTIFICADO', 0, 100, { align: 'center' });

  doc.fontSize(12).font('Helvetica')
     .text(`Certificado Nº ${data.certificate_id}`, 0, 130, { align: 'center' });

  // Body
  doc.fontSize(14).font('Helvetica')
     .text('Certificamos que', 0, 200, { align: 'center' });

  doc.fontSize(20).font('Helvetica-Bold')
     .text(data.student_name.toUpperCase(), 0, 230, { align: 'center' });

  doc.fontSize(14).font('Helvetica')
     .text('concluiu com aprovação o curso', 0, 260, { align: 'center' });

  doc.fontSize(18).font('Helvetica-Bold')
     .text(data.course_title, 0, 290, { align: 'center', width: 600 });

  doc.fontSize(12).font('Helvetica')
     .text(
       `Baseado na metodologia SISTUR de Mario Carlos Beni | Pilar: ${data.pillar} | Carga horária: ${Math.floor(data.workload / 60)}h`,
       0,
       340,
       { align: 'center' }
     );

  // Footer
  const issueDate = new Date(data.issue_date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  doc.fontSize(10)
     .text(`São Paulo, ${issueDate}`, 0, 450, { align: 'center' });

  // QR Code
  const qrCodeDataUrl = await QRCode.toDataURL(data.qr_code_url, { width: 100 });
  const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
  doc.image(qrCodeBuffer, 680, 480, { width: 80, height: 80 });

  doc.fontSize(8)
     .text(`Verificação: ${data.verification_code}`, 640, 570, { width: 160, align: 'center' });

  // Signature
  doc.fontSize(10)
     .text('____________________________', 0, 500, { align: 'center' });
  doc.text('Christiana Beni', 0, 515, { align: 'center' });
  doc.fontSize(8)
     .text('Governança SISTUR EDU', 0, 530, { align: 'center' });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}
```

### 5.3 Página Pública de Verificação

```typescript
// API endpoint: GET /verify/:code
export async function verifyCertificate(code: string) {
  const cert = await db.query(`
    SELECT
      c.*,
      u.full_name as student_name,
      co.title as course_title,
      co.workload_minutes,
      co.primary_pillar
    FROM certificates c
    JOIN users u ON u.user_id = c.user_id
    JOIN courses co ON co.course_id = c.course_id AND co.version = c.course_version
    WHERE c.verification_code = $1
      AND c.status = 'active'
  `, [code]);

  if (!cert) {
    return { valid: false, message: 'Certificado não encontrado ou inválido' };
  }

  return {
    valid: true,
    certificate: {
      id: cert.certificate_id,
      student_name: cert.student_name,
      course_title: cert.course_title,
      issue_date: cert.issued_at,
      workload_hours: Math.floor(cert.workload_minutes / 60),
      pillar: cert.primary_pillar,
      pdf_url: cert.pdf_uri
    }
  };
}
```

---

## 🔗 PARTE 6: INTEGRAÇÃO SISTUR ERP

### 6.1 Fluxo Completo

```
┌─────────────────┐
│  SISTUR ERP     │
│  (Diagnóstico)  │
└────────┬────────┘
         │
         │ POST /api/erp/diagnostic
         │ {
         │   entity: "Município X",
         │   pillar_priority: "RA",
         │   indicators: {...},
         │   igma_warnings: [...]
         │ }
         ↓
┌─────────────────────┐
│  SISTUR EDU         │
│  (Recomendação)     │
└────────┬────────────┘
         │
         │ 1. Analisa diagnóstico
         │ 2. Identifica lacunas
         │ 3. Recomenda trilhas/cursos
         │
         │ POST /api/erp/prescription
         │ {
         │   recommended_track_id: "uuid",
         │   recommended_courses: [...],
         │   target_roles: ["PUBLIC_MANAGER"],
         │   reasoning: "RA crítico..."
         │ }
         ↓
┌─────────────────┐
│  SISTUR ERP     │
│  (Prescrição)   │
└────────┬────────┘
         │
         │ Gestor recebe recomendação
         │ Equipe se matricula
         │ Faz cursos e provas
         ↓
┌─────────────────────┐
│  SISTUR EDU         │
│  (Certificação)     │
└────────┬────────────┘
         │
         │ POST /api/erp/certification-status
         │ {
         │   entity: "Município X",
         │   certified_users: [
         │     {user_id, course_id, certificate_id, date}
         │   ]
         │ }
         ↓
┌─────────────────┐
│  SISTUR ERP     │
│  (Atualização)  │
└─────────────────┘
```

### 6.2 Edge Function: Receber Diagnóstico

```typescript
// supabase/functions/erp-receive-diagnostic/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { tenant_id, entity_ref, entity_type, pillar_priority, indicators_data, igma_warnings } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Salva diagnóstico
    const { data: diagnostic, error: diagError } = await supabase
      .from('erp_diagnostics')
      .insert({
        tenant_id,
        entity_ref,
        entity_type,
        pillar_priority,
        indicators_data,
        igma_warnings
      })
      .select()
      .single();

    if (diagError) throw diagError;

    // 2. Analisa e gera prescrição
    const prescription = await generateLearningPrescription(diagnostic, supabase);

    // 3. Log evento
    await supabase.from('erp_event_log').insert({
      tenant_id,
      event_type: 'diagnostic_received',
      payload: { diagnostic_id: diagnostic.diagnostic_id }
    });

    return new Response(JSON.stringify({
      success: true,
      diagnostic_id: diagnostic.diagnostic_id,
      prescription
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error receiving diagnostic:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function generateLearningPrescription(diagnostic: any, supabase: any) {
  // Lógica de recomendação baseada em pilar crítico
  const { data: tracks } = await supabase
    .from('tracks')
    .select('*')
    .eq('pillar_scope', diagnostic.pillar_priority)
    .eq('status', 'published')
    .order('level', { ascending: true })
    .limit(3);

  const recommendedTrackId = tracks?.[0]?.track_id;

  const { data: courses } = await supabase
    .from('courses')
    .select('course_id, title')
    .eq('primary_pillar', diagnostic.pillar_priority)
    .eq('status', 'published')
    .order('level', { ascending: true })
    .limit(5);

  const reasoning = `Diagnóstico identificou ${diagnostic.pillar_priority} como pilar prioritário. ` +
    `Recomendamos capacitação focada neste pilar para fortalecer a base do sistema turístico.`;

  const { data: prescription } = await supabase
    .from('learning_prescriptions')
    .insert({
      diagnostic_id: diagnostic.diagnostic_id,
      recommended_track_id: recommendedTrackId,
      recommended_courses: courses?.map(c => c.course_id) || [],
      target_roles: ['PUBLIC_MANAGER', 'CONSULTANT'],
      reasoning
    })
    .select()
    .single();

  return prescription;
}
```

---

## 📚 PARTE 7: BACKLOG PARA LOVABLE (MVP)

### Sprint 1: Fundação (Database + Auth)
**Objetivo**: Criar base de dados e autenticação

**Tasks**:
- [ ] Executar todos os schemas SQL em ordem
- [ ] Criar função `generate_certificate_id()`
- [ ] Criar função `create_audit_log()`
- [ ] Inserir seed data de Mario Beni (6 obras)
- [ ] Inserir seed data de roles
- [ ] Configurar RLS policies
- [ ] Testar autenticação básica

**Critério de Aceite**:
- Usuário consegue fazer signup/login
- Perfil é criado automaticamente
- Role é atribuída
- Seed data está visível

---

### Sprint 2: Conteúdo Autoral + Cursos
**Objetivo**: Gerenciar conteúdo e criar cursos

**Tasks**:
- [ ] UI para visualizar `content_items`
- [ ] UI para criar/editar `courses`
- [ ] UI para criar `modules` e `lessons`
- [ ] Relacionar lessons com `content_items` (auditoria)
- [ ] Criar pelo menos 1 curso completo de exemplo

**Critério de Aceite**:
- Admin consegue criar curso
- Curso tem módulos e aulas
- Cada aula cita fonte (content_item)
- Curso é versionado

---

### Sprint 3: Trilhas + Matrícula
**Objetivo**: Permitir estudante se matricular

**Tasks**:
- [ ] UI para visualizar `tracks`
- [ ] UI para visualizar `courses` públicos
- [ ] Botão "Matricular" cria `enrollment`
- [ ] Dashboard do aluno mostra matrículas
- [ ] Visualizar progresso de aulas

**Critério de Aceite**:
- Aluno consegue se matricular
- Aluno vê suas matrículas
- Aluno consegue acessar aulas
- Progresso é salvo

---

### Sprint 4: Motor On-Demand (CORE)
**Objetivo**: Gerar trilhas personalizadas

**Tasks**:
- [ ] UI: Formulário de solicitação on-demand
- [ ] Edge function: `generate-ondemand-track`
- [ ] Lógica de seleção de conteúdo
- [ ] Geração de `track_instance`
- [ ] Registrar `ondemand_output_sources` (auditoria)
- [ ] UI: Visualizar trilha gerada

**Critério de Aceite**:
- Usuário preenche formulário
- Sistema gera trilha automaticamente
- Trilha é navegável
- Fontes usadas são rastreáveis

---

### Sprint 5: Banco de Quizzes
**Objetivo**: Preparar questões para provas

**Tasks**:
- [ ] UI Admin: Criar/editar `quiz_questions`
- [ ] UI Admin: Criar `quiz_options`
- [ ] Importar base existente (+5.000 quizzes)
- [ ] Relacionar quizzes com `content_items`
- [ ] Filtros por pilar, nível, tema

**Critério de Aceite**:
- Admin consegue criar quiz
- Quizzes filtráveis
- Base importada
- Auditoria de fontes funciona

---

### Sprint 6: Provas Dinâmicas (ANTI-COLA)
**Objetivo**: Gerar provas únicas

**Tasks**:
- [ ] Criar `exam_rulesets` por curso
- [ ] Edge function: `generate-exam`
- [ ] Lógica anti-repetição (`quiz_usage_history`)
- [ ] Hash de composição único
- [ ] Randomização de alternativas (frontend)
- [ ] UI: Exibir prova ao aluno
- [ ] Timer de prova

**Critério de Aceite**:
- Prova gerada é única (hash diferente)
- Aluno não vê mesma questão 2x em <30 dias
- Alternativas embaralhadas
- Timer funciona

---

### Sprint 7: Correção + Certificação
**Objetivo**: Corrigir prova e emitir certificado

**Tasks**:
- [ ] Edge function: `grade-exam`
- [ ] Lógica de correção automática
- [ ] Atualizar `exam_attempts` com resultado
- [ ] Edge function: `generate-certificate`
- [ ] Gerar PDF com QR Code
- [ ] Upload para Supabase Storage
- [ ] Email com certificado

**Critério de Aceite**:
- Prova é corrigida automaticamente
- Nota calculada corretamente
- Se aprovado, certificado gerado
- PDF baixável
- QR Code funciona

---

### Sprint 8: Verificação Pública
**Objetivo**: Permitir verificação de certificados

**Tasks**:
- [ ] Página pública `/verify/:code`
- [ ] API: `GET /verify/:code`
- [ ] Exibir dados do certificado
- [ ] Link para download PDF
- [ ] QR Code redireciona corretamente

**Critério de Aceite**:
- QR Code abre página pública
- Dados do certificado visíveis
- PDF pode ser baixado
- Certificado revogado não aparece

---

### Sprint 9: Integração ERP
**Objetivo**: Conectar EDU ↔ ERP

**Tasks**:
- [ ] Edge function: `erp-receive-diagnostic`
- [ ] Gerar `learning_prescription`
- [ ] Edge function: `erp-send-certification-status`
- [ ] Log em `erp_event_log`

**Critério de Aceite**:
- ERP envia diagnóstico
- EDU recomenda trilhas
- EDU retorna status de certificação
- Eventos logados

---

### Sprint 10: Auditoria + Admin
**Objetivo**: Governança e logs

**Tasks**:
- [ ] Trigger automático para `audit_logs`
- [ ] UI Admin: Visualizar logs
- [ ] UI Admin: Relatórios institucionais
- [ ] UI Admin: Gerenciar usuários/roles
- [ ] UI Admin: Configurar provas

**Critério de Aceite**:
- Toda ação importante é logada
- Logs são imutáveis
- Admin visualiza relatórios
- Admin gerencia sistema

---

## 🎨 PARTE 8: TYPESCRIPT TYPES (Completo)

Adicionar em `src/types/sistur.ts`:

```typescript
// ==========================================
// TENANTS
// ==========================================

export type TenantType = 'B2G' | 'B2B' | 'B2U';
export type TenantStatus = 'active' | 'suspended' | 'cancelled';

export interface Tenant {
  tenant_id: string;
  name: string;
  type: TenantType;
  status: TenantStatus;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ==========================================
// USERS & ROLES
// ==========================================

export type UserStatus = 'active' | 'blocked' | 'suspended';

export type RoleName =
  | 'STUDENT'
  | 'TEACHER'
  | 'RESEARCHER'
  | 'PUBLIC_MANAGER'
  | 'ENTREPRENEUR'
  | 'CONSULTANT'
  | 'INSTITUTIONAL_ADMIN'
  | 'PLATFORM_ADMIN';

export interface User {
  user_id: string;
  tenant_id?: string;
  full_name: string;
  email: string;
  auth_uid: string;
  status: UserStatus;
  max_level: number;
  created_at: string;
  updated_at: string;
}

export interface Role {
  role_id: string;
  name: RoleName;
  description?: string;
  default_max_level: number;
  permissions: string[];
}

// ==========================================
// CONTENT
// ==========================================

export type ContentType =
  | 'BOOK'
  | 'BOOK_CHAPTER'
  | 'ARTICLE'
  | 'LIVE'
  | 'LECTURE'
  | 'SPEECH'
  | 'VIDEO'
  | 'INTERVIEW'
  | 'THESIS';

export type ContentStatus = 'draft' | 'validated' | 'published' | 'archived';

export interface ContentItem {
  content_id: string;
  author: string;
  content_type: ContentType;
  title: string;
  subtitle?: string;
  publication_year?: number;
  publisher?: string;
  isbn?: string;
  doi?: string;
  source_uri?: string;
  transcript_text?: string;
  summary?: string;
  abstract?: string;
  primary_pillar: 'RA' | 'OE' | 'AO';
  secondary_pillar?: 'RA' | 'OE' | 'AO';
  level: number;
  version: number;
  status: ContentStatus;
  topics: string[];
  keywords: string[];
  key_concepts: Record<string, any>;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// COURSES
// ==========================================

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Course {
  course_id: string;
  tenant_id?: string;
  title: string;
  description?: string;
  primary_pillar: 'RA' | 'OE' | 'AO';
  level: number;
  version: number;
  status: CourseStatus;
  workload_minutes?: number;
  learning_objectives?: string[];
  created_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  module_id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type LessonType = 'video' | 'text' | 'interactive' | 'quiz';

export interface Lesson {
  lesson_id: string;
  module_id: string;
  title: string;
  description?: string;
  order_index: number;
  lesson_type: LessonType;
  estimated_minutes?: number;
  video_url?: string;
  content_text?: string;
  slides_url?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// TRACKS
// ==========================================

export type PillarScope = 'RA' | 'OE' | 'AO' | 'INTEGRATED';
export type TrackStatus = 'draft' | 'published' | 'archived';

export interface Track {
  track_id: string;
  tenant_id?: string;
  title: string;
  description?: string;
  pillar_scope: PillarScope;
  level: number;
  status: TrackStatus;
  total_workload_minutes?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// ENROLLMENT & PROGRESS
// ==========================================

export type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'suspended';
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface Enrollment {
  enrollment_id: string;
  user_id: string;
  course_id: string;
  course_version: number;
  status: EnrollmentStatus;
  started_at: string;
  completed_at?: string;
  last_accessed_at?: string;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  user_id: string;
  lesson_id: string;
  status: LessonProgressStatus;
  progress_pct: number;
  time_spent_minutes: number;
  started_at?: string;
  completed_at?: string;
  last_accessed_at?: string;
}

// ==========================================
// QUIZZES
// ==========================================

export type QuizOrigin = 'existing' | 'generated' | 'imported';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuizQuestion {
  quiz_id: string;
  origin: QuizOrigin;
  pillar: 'RA' | 'OE' | 'AO';
  level: number;
  theme?: string;
  question_type: QuestionType;
  stem: string;
  explanation?: string;
  difficulty?: number;
  discrimination_index?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizOption {
  option_id: string;
  quiz_id: string;
  option_label: string;
  option_text: string;
  is_correct: boolean;
  created_at: string;
}

// ==========================================
// EXAMS
// ==========================================

export type ExamStatus = 'generated' | 'started' | 'submitted' | 'expired' | 'voided';
export type ExamResult = 'passed' | 'failed' | 'pending';
export type GradingMode = 'automatic' | 'hybrid' | 'manual';

export interface ExamRuleset {
  ruleset_id: string;
  course_id: string;
  min_score_pct: number;
  time_limit_minutes: number;
  question_count: number;
  pillar_mix?: Record<string, number>;
  allow_retake: boolean;
  retake_wait_hours: number;
  max_attempts: number;
  min_days_between_same_quiz: number;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  exam_id: string;
  user_id: string;
  course_id: string;
  course_version: number;
  ruleset_id: string;
  composition_hash: string;
  question_ids: string[];
  status: ExamStatus;
  created_at: string;
  expires_at: string;
  started_at?: string;
  submitted_at?: string;
}

export interface ExamAttempt {
  attempt_id: string;
  exam_id: string;
  user_id: string;
  started_at: string;
  submitted_at?: string;
  score_pct?: number;
  result?: ExamResult;
  grading_mode: GradingMode;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ExamAnswer {
  attempt_id: string;
  quiz_id: string;
  selected_option_id?: string;
  free_text_answer?: string;
  is_correct?: boolean;
  awarded_points: number;
  answered_at?: string;
}

// ==========================================
// CERTIFICATES
// ==========================================

export type CertificateStatus = 'active' | 'revoked' | 'expired';

export interface Certificate {
  certificate_id: string;
  user_id: string;
  course_id: string;
  course_version: number;
  attempt_id: string;
  issued_at: string;
  workload_minutes: number;
  pillar_scope: string;
  verification_code: string;
  qr_verify_url?: string;
  pdf_uri?: string;
  pdf_generated_at?: string;
  status: CertificateStatus;
  revoked_at?: string;
  revoked_reason?: string;
  created_at: string;
}

// ==========================================
// ON-DEMAND
// ==========================================

export type OnDemandGoalType =
  | 'course'
  | 'track'
  | 'lesson_plan'
  | 'tcc_outline'
  | 'thesis_outline'
  | 'training_plan';

export type OnDemandContextType = 'academic' | 'institutional' | 'professional';

export type OnDemandStatus =
  | 'received'
  | 'validated'
  | 'generating'
  | 'generated'
  | 'rejected'
  | 'failed';

export interface OnDemandRequest {
  request_id: string;
  user_id: string;
  tenant_id?: string;
  goal_type: OnDemandGoalType;
  context_type?: OnDemandContextType;
  desired_pillar?: PillarScope;
  desired_level?: number;
  topic_text: string;
  additional_context?: string;
  specific_topics?: string[];
  learning_goals?: string[];
  status: OnDemandStatus;
  processing_time_seconds?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export type OnDemandOutputType =
  | 'track_instance'
  | 'course_instance'
  | 'lesson_plan'
  | 'tcc_outline'
  | 'thesis_outline'
  | 'training_plan';

export interface OnDemandOutput {
  output_id: string;
  request_id: string;
  output_type: OnDemandOutputType;
  title: string;
  description?: string;
  payload: Record<string, any>;
  file_uri?: string;
  created_at: string;
}

// ==========================================
// ERP INTEGRATION
// ==========================================

export type ERPEntityType = 'municipality' | 'government' | 'company';

export interface ERPDiagnostic {
  diagnostic_id: string;
  tenant_id?: string;
  entity_ref: string;
  entity_type?: ERPEntityType;
  pillar_priority?: 'RA' | 'OE' | 'AO';
  indicators_data?: Record<string, any>;
  igma_warnings?: Record<string, any>;
  created_at: string;
}

export interface LearningPrescription {
  prescription_id: string;
  diagnostic_id: string;
  recommended_track_id?: string;
  recommended_courses?: string[];
  target_roles?: string[];
  reasoning?: string;
  created_at: string;
}

// ==========================================
// AUDIT
// ==========================================

export interface AuditLog {
  log_id: string;
  tenant_id?: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
```

---

## ✅ CHECKLIST FINAL PARA LOVABLE

### Database
- [ ] Executar Schema 1: Multi-tenant e Usuários
- [ ] Executar Schema 2: Conteúdo Autoral (com seed data)
- [ ] Executar Schema 3: Cursos, Módulos, Trilhas
- [ ] Executar Schema 4: Progresso do Aluno
- [ ] Executar Schema 5: Quizzes
- [ ] Executar Schema 6: Provas Dinâmicas
- [ ] Executar Schema 7: Certificados
- [ ] Executar Schema 8: Motor On-Demand
- [ ] Executar Schema 9: Integração ERP
- [ ] Executar Schema 10: Auditoria
- [ ] Verificar RLS policies ativas
- [ ] Verificar indexes criados
- [ ] Verificar seed data inserido

### Types
- [ ] Adicionar todos os types em `src/types/sistur.ts`

### Backlog
- [ ] Criar issues no Jira/GitHub conforme Sprints 1-10
- [ ] Atribuir prioridades
- [ ] Definir critérios de aceite

### MVP Mínimo
- [ ] Sprint 1: Fundação OK
- [ ] Sprint 2: Conteúdo + Cursos OK
- [ ] Sprint 3: Trilhas + Matrícula OK
- [ ] Sprint 4: Motor On-Demand OK
- [ ] Sprint 5: Banco de Quizzes OK
- [ ] Sprint 6: Provas Dinâmicas OK
- [ ] Sprint 7: Certificação OK

### Teste Final
- [ ] Usuário consegue se cadastrar
- [ ] Usuário tem perfil e role
- [ ] Usuário consegue ver cursos/trilhas
- [ ] Usuário consegue se matricular
- [ ] Usuário consegue estudar aulas
- [ ] Usuário consegue solicitar on-demand
- [ ] Trilha on-demand é gerada
- [ ] Usuário consegue fazer prova
- [ ] Prova é única (hash diferente)
- [ ] Prova é corrigida automaticamente
- [ ] Certificado é emitido se aprovado
- [ ] Certificado pode ser verificado publicamente
- [ ] Todos os logs são criados

---

## 🎉 CONCLUSÃO

Este documento contém **TUDO** necessário para implementar o SISTUR EDU como um **LMS completo e profissional**:

✅ **10 Schemas SQL completos** (multi-tenant, conteúdo, cursos, quizzes, provas, certificados, on-demand, ERP, auditoria)
✅ **Seed data** de Mario Beni (6 obras principais)
✅ **Motor On-Demand** com lógica completa
✅ **Sistema Anti-Cola** com randomização e hash único
✅ **Certificação Automática** com PDF e QR Code
✅ **Integração ERP** bidirecional
✅ **Auditoria governamental** (logs imutáveis)
✅ **TypeScript Types** completos
✅ **Backlog de 10 Sprints** prontos para Jira

**Arquivo preparado para**: Lovable Platform
**Tamanho**: ~2.500 linhas de documentação técnica
**Pronto para**: Implementação imediata

---

**Documento preparado por**: Claude (Anthropic)
**Para**: SISTUR EDU - Sistema de Gestão de Aprendizagem
**Base Conceitual**: Mario Carlos Beni
**Governança**: Christiana Beni
**Data**: Janeiro 2026
**Versão**: 1.0
