-- ==========================================
-- SISTUR EDU LMS - SPRINT 1: FOUNDATION
-- Schema 1: Multi-Tenant + Roles (extended)
-- ==========================================

-- Create LMS-specific role type
CREATE TYPE public.lms_role_name AS ENUM (
  'STUDENT',
  'TEACHER',
  'RESEARCHER',
  'PUBLIC_MANAGER',
  'ENTREPRENEUR',
  'CONSULTANT',
  'INSTITUTIONAL_ADMIN',
  'PLATFORM_ADMIN'
);

-- ==========================================
-- LMS ROLES TABLE
-- ==========================================

CREATE TABLE public.lms_roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name lms_role_name NOT NULL UNIQUE,
  description TEXT,
  default_max_level INTEGER DEFAULT 3 CHECK (default_max_level BETWEEN 1 AND 5),
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial roles
INSERT INTO public.lms_roles (name, description, default_max_level) VALUES
  ('STUDENT', 'Estudante de graduação/técnico', 3),
  ('TEACHER', 'Professor de turismo', 4),
  ('RESEARCHER', 'Pesquisador/Pós-graduação', 5),
  ('PUBLIC_MANAGER', 'Gestor Público de turismo', 4),
  ('ENTREPRENEUR', 'Empresário setor privado', 3),
  ('CONSULTANT', 'Consultor técnico', 4),
  ('INSTITUTIONAL_ADMIN', 'Administrador Institucional', 5),
  ('PLATFORM_ADMIN', 'Administrador da Plataforma', 5);

-- ==========================================
-- LMS USER PROFILES (extends profiles)
-- ==========================================

CREATE TABLE public.lms_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  lms_role_id UUID REFERENCES public.lms_roles(role_id),
  max_level INTEGER NOT NULL DEFAULT 3 CHECK (max_level BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_lms_user_profiles_user ON public.lms_user_profiles(user_id);
CREATE INDEX idx_lms_user_profiles_org ON public.lms_user_profiles(org_id);
CREATE INDEX idx_lms_user_profiles_role ON public.lms_user_profiles(lms_role_id);

-- ==========================================
-- CONTENT ITEMS (Mario Beni's Works - Base Autoral)
-- ==========================================

CREATE TYPE public.content_type AS ENUM (
  'BOOK',
  'BOOK_CHAPTER',
  'ARTICLE',
  'LIVE',
  'LECTURE',
  'SPEECH',
  'VIDEO',
  'INTERVIEW',
  'THESIS'
);

CREATE TYPE public.content_status AS ENUM (
  'draft',
  'validated',
  'published',
  'archived'
);

CREATE TABLE public.content_items (
  content_id TEXT PRIMARY KEY,
  author TEXT NOT NULL DEFAULT 'Mario Carlos Beni',
  content_type content_type NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  publication_year INTEGER,
  publisher TEXT,
  isbn TEXT,
  doi TEXT,
  source_uri TEXT,
  transcript_text TEXT,
  summary TEXT,
  abstract TEXT,
  primary_pillar TEXT NOT NULL CHECK (primary_pillar IN ('RA', 'OE', 'AO')),
  secondary_pillar TEXT CHECK (secondary_pillar IN ('RA', 'OE', 'AO')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  version INTEGER NOT NULL DEFAULT 1,
  status content_status NOT NULL DEFAULT 'draft',
  topics TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  key_concepts JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  validated_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_items_pillar ON public.content_items(primary_pillar);
CREATE INDEX idx_content_items_level ON public.content_items(level);
CREATE INDEX idx_content_items_type ON public.content_items(content_type);
CREATE INDEX idx_content_items_status ON public.content_items(status);
CREATE INDEX idx_content_items_topics ON public.content_items USING gin(topics);
CREATE INDEX idx_content_items_keywords ON public.content_items USING gin(keywords);

-- Full-text search em português
CREATE INDEX idx_content_items_search ON public.content_items
  USING gin(to_tsvector('portuguese',
    title || ' ' || COALESCE(abstract, '') || ' ' || COALESCE(summary, '')
  ));

-- ==========================================
-- SEED DATA: Mario Beni's Major Works
-- ==========================================

INSERT INTO public.content_items (
  content_id, content_type, title, subtitle, publication_year, publisher, isbn,
  primary_pillar, secondary_pillar, level, topics, keywords, abstract, summary, key_concepts, status
) VALUES
(
  'MB-001', 'BOOK', 'Análise Estrutural do Turismo', NULL, 2001, 'Editora Senac São Paulo', '9788573592344',
  'OE', NULL, 4,
  ARRAY['teoria sistêmica', 'SISTUR', 'análise estrutural', 'metodologia'],
  ARRAY['turismo', 'sistema', 'SISTUR', 'estrutural', 'holístico'],
  'Obra fundamental que apresenta o modelo SISTUR (Sistema de Turismo) e a teoria sistêmica aplicada ao turismo.',
  'Este livro é a base teórica do SISTUR. Beni apresenta o turismo como um sistema aberto, dividido em três conjuntos interdependentes: RA (Relações Ambientais), OE (Organização Estrutural) e AO (Ações Operacionais).',
  '{"sistur_model": "Sistema aberto com três conjuntos interdependentes", "ra_primacy": "Meio ambiente como base fundamental do turismo", "oe_dependency": "Infraestrutura depende de ambiente saudável", "ao_subordination": "Operação subordinada a RA e OE"}'::jsonb,
  'published'
),
(
  'MB-002', 'BOOK_CHAPTER', 'O Conjunto das Relações Ambientais', 'Capítulo de Análise Estrutural do Turismo',
  2001, 'Editora Senac São Paulo', '9788573592344', 'RA', NULL, 4,
  ARRAY['meio ambiente', 'sustentabilidade', 'patrimônio cultural', 'comunidade', 'capacidade de carga'],
  ARRAY['RA', 'ambiente', 'ecologia', 'cultura', 'social'],
  'Capítulo fundamental que detalha o primeiro conjunto do SISTUR: as Relações Ambientais (RA).',
  'Beni explica que o turismo depende fundamentalmente do meio ambiente natural e cultural. O RA constitui a base de todo sistema turístico.',
  '{"environmental_foundation": "RA é a base essencial do sistema turístico", "subsystems": ["ecológico", "social", "econômico", "cultural"], "carrying_capacity": "Capacidade de carga ambiental e social"}'::jsonb,
  'published'
),
(
  'MB-003', 'BOOK_CHAPTER', 'O Conjunto da Organização Estrutural', 'Capítulo de Análise Estrutural do Turismo',
  2001, 'Editora Senac São Paulo', '9788573592344', 'OE', 'AO', 4,
  ARRAY['infraestrutura', 'superestrutura', 'governança', 'planejamento', 'políticas públicas'],
  ARRAY['OE', 'infraestrutura', 'equipamentos', 'governança', 'instituições'],
  'Capítulo dedicado ao segundo conjunto do SISTUR: a Organização Estrutural (OE).',
  'Detalha a infraestrutura turística (meios de hospedagem, transportes, equipamentos, serviços) e a superestrutura (órgãos públicos de turismo, legislação, políticas públicas, planejamento).',
  '{"infrastructure": "Base física: hotéis, transportes, equipamentos, serviços", "superstructure": "Base institucional: órgãos, leis, políticas, planejamento", "dependency_on_ra": "OE só funciona se RA estiver saudável"}'::jsonb,
  'published'
),
(
  'MB-004', 'BOOK_CHAPTER', 'O Conjunto das Ações Operacionais', 'Capítulo de Análise Estrutural do Turismo',
  2001, 'Editora Senac São Paulo', '9788573592344', 'AO', NULL, 3,
  ARRAY['operação turística', 'marketing', 'comercialização', 'distribuição', 'experiência'],
  ARRAY['AO', 'operação', 'marketing', 'agências', 'tour operators'],
  'Capítulo sobre o terceiro conjunto do SISTUR: as Ações Operacionais (AO).',
  'Aborda comercialização, distribuição, marketing e operação dos produtos turísticos. É o conjunto mais visível para o turista.',
  '{"commercialization": "Comercialização de produtos e serviços", "marketing_promotion": "Marketing e promoção de destinos", "subordination": "AO subordinado a RA e OE - não compensa deficiências"}'::jsonb,
  'published'
),
(
  'MB-005', 'ARTICLE', 'Turismo: Da Economia de Serviços à Economia da Experiência', NULL,
  2003, 'Revista Turismo em Análise', NULL, 'AO', 'OE', 4,
  ARRAY['economia da experiência', 'serviços turísticos', 'qualidade', 'memorabilidade'],
  ARRAY['experiência', 'qualidade', 'autenticidade', 'memorabilidade'],
  'Artigo que analisa a evolução do turismo da economia de serviços para a economia da experiência.',
  'Beni discute como o turismo evoluiu de uma indústria focada em serviços padronizados para uma economia baseada em experiências memoráveis e transformadoras.',
  '{"experience_economy": "Turismo como economia da experiência", "memorable_experiences": "Experiências memoráveis e transformadoras", "authenticity": "Autenticidade como valor fundamental"}'::jsonb,
  'published'
),
(
  'MB-006', 'LECTURE', 'Planejamento Estratégico de Destinos Turísticos', 'Palestra sobre metodologia SISTUR aplicada',
  2010, NULL, NULL, 'OE', 'RA', 5,
  ARRAY['planejamento estratégico', 'destinos turísticos', 'diagnóstico sistêmico', 'desenvolvimento sustentável'],
  ARRAY['planejamento', 'estratégia', 'diagnóstico', 'participação'],
  'Palestra sobre metodologia de planejamento estratégico de destinos turísticos baseada no modelo SISTUR.',
  'Beni apresenta metodologia de planejamento que integra os três conjuntos do SISTUR. Enfatiza a necessidade de diagnóstico sistêmico prévio a qualquer intervenção.',
  '{"systemic_diagnosis": "Diagnóstico sistêmico dos três conjuntos (RA, OE, AO)", "strategic_planning": "Planejamento estratégico participativo", "stakeholder_engagement": "Envolvimento de todos os atores sociais"}'::jsonb,
  'published'
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.lms_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- LMS Roles - viewable by all authenticated users
CREATE POLICY "Anyone can view LMS roles"
  ON public.lms_roles FOR SELECT
  USING (true);

-- LMS User Profiles
CREATE POLICY "Users can view their own LMS profile"
  ON public.lms_user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own LMS profile"
  ON public.lms_user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LMS profile"
  ON public.lms_user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage LMS profiles in their org"
  ON public.lms_user_profiles FOR ALL
  USING (
    org_id IS NOT NULL AND 
    user_belongs_to_org(auth.uid(), org_id) AND 
    has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- Content Items - published content viewable by all
CREATE POLICY "Public can view published content"
  ON public.content_items FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage all content"
  ON public.content_items FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));