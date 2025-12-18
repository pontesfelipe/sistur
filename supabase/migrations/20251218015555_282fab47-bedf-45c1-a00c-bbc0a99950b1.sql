-- Enum for collection methods
CREATE TYPE public.external_collection_method AS ENUM ('AUTOMATIC', 'BATCH', 'MANUAL');

-- Table 1: external_data_sources - Catalog of official data sources
CREATE TABLE public.external_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  update_frequency TEXT DEFAULT 'anual',
  trust_level_default INTEGER NOT NULL DEFAULT 3 CHECK (trust_level_default BETWEEN 1 AND 5),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_data_sources ENABLE ROW LEVEL SECURITY;

-- Public read access (sources are global reference data)
CREATE POLICY "Anyone can view external data sources"
ON public.external_data_sources FOR SELECT
USING (true);

-- Only admins can manage sources
CREATE POLICY "Admins can manage external data sources"
ON public.external_data_sources FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Table 2: external_indicator_values - Raw imported data
CREATE TABLE public.external_indicator_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_code TEXT NOT NULL,
  municipality_ibge_code TEXT NOT NULL,
  source_code TEXT NOT NULL REFERENCES public.external_data_sources(code),
  raw_value NUMERIC,
  raw_value_text TEXT,
  reference_year INTEGER,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  collection_method public.external_collection_method NOT NULL DEFAULT 'MANUAL',
  confidence_level INTEGER NOT NULL DEFAULT 3 CHECK (confidence_level BETWEEN 1 AND 5),
  validated BOOLEAN NOT NULL DEFAULT false,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_indicator_values ENABLE ROW LEVEL SECURITY;

-- Users can view values in their org
CREATE POLICY "Users can view external indicator values in their org"
ON public.external_indicator_values FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

-- Admins/Analysts can manage values
CREATE POLICY "Admins/Analysts can manage external indicator values"
ON public.external_indicator_values FOR ALL
USING (user_belongs_to_org(auth.uid(), org_id) AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role)));

-- Table 3: diagnosis_data_snapshots - Frozen data used in each diagnosis
CREATE TABLE public.diagnosis_data_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  indicator_code TEXT NOT NULL,
  value_used NUMERIC,
  value_used_text TEXT,
  source_code TEXT NOT NULL,
  reference_year INTEGER,
  confidence_level INTEGER NOT NULL DEFAULT 3 CHECK (confidence_level BETWEEN 1 AND 5),
  was_manually_adjusted BOOLEAN NOT NULL DEFAULT false,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnosis_data_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can view snapshots in their org
CREATE POLICY "Users can view diagnosis data snapshots in their org"
ON public.diagnosis_data_snapshots FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

-- Admins/Analysts can manage snapshots
CREATE POLICY "Admins/Analysts can manage diagnosis data snapshots"
ON public.diagnosis_data_snapshots FOR ALL
USING (user_belongs_to_org(auth.uid(), org_id) AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role)));

-- Create indexes for performance
CREATE INDEX idx_external_indicator_values_ibge ON public.external_indicator_values(municipality_ibge_code);
CREATE INDEX idx_external_indicator_values_indicator ON public.external_indicator_values(indicator_code);
CREATE INDEX idx_external_indicator_values_source ON public.external_indicator_values(source_code);
CREATE INDEX idx_diagnosis_data_snapshots_assessment ON public.diagnosis_data_snapshots(assessment_id);

-- Insert official data sources
INSERT INTO public.external_data_sources (code, name, description, update_frequency, trust_level_default) VALUES
  ('IBGE', 'Instituto Brasileiro de Geografia e Estatística', 'Base estrutural e chave de integração - dados demográficos, econômicos e territoriais', 'anual', 5),
  ('DATASUS', 'Departamento de Informática do SUS', 'Dados de saúde e bem-estar da população', 'anual', 5),
  ('INEP', 'Instituto Nacional de Estudos e Pesquisas Educacionais', 'Dados educacionais - IDEB, matrículas, infraestrutura escolar', 'anual', 5),
  ('STN', 'Secretaria do Tesouro Nacional', 'Dados de gestão fiscal municipal - receitas, despesas, dívida', 'anual', 5),
  ('CADASTUR', 'Cadastro de Prestadores de Serviços Turísticos', 'Oferta turística - estabelecimentos, guias, equipamentos', 'mensal', 4);