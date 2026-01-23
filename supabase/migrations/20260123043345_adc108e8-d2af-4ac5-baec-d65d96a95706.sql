-- Add organization type enum
CREATE TYPE public.org_type AS ENUM ('PUBLIC', 'PRIVATE');

-- Add org_type column to orgs table
ALTER TABLE public.orgs 
ADD COLUMN org_type public.org_type DEFAULT 'PUBLIC';

-- Add comment for documentation
COMMENT ON COLUMN public.orgs.org_type IS 'PUBLIC = Governo/Estado/Município, PRIVATE = Hotel/Resort/Pousada/Empresa';

-- Create enterprise indicator categories table
CREATE TABLE public.enterprise_indicator_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('RA', 'OE', 'AO')),
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enterprise_indicator_categories ENABLE ROW LEVEL SECURITY;

-- Public read access for categories
CREATE POLICY "Enterprise categories are viewable by all authenticated users"
ON public.enterprise_indicator_categories FOR SELECT TO authenticated USING (true);

-- Admin only write access
CREATE POLICY "Admins can manage enterprise categories"
ON public.enterprise_indicator_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Insert enterprise-specific indicator categories based on Mario Beni's framework
INSERT INTO public.enterprise_indicator_categories (code, name, pillar, description, sort_order) VALUES
-- I-RA: Relações Ambientais (Sustentabilidade Operacional)
('RA_SUST_ENERGIA', 'Eficiência Energética', 'RA', 'Consumo de energia por UH ocupada, fontes renováveis', 1),
('RA_SUST_AGUA', 'Gestão Hídrica', 'RA', 'Consumo de água per capita, reuso, captação pluvial', 2),
('RA_SUST_RESIDUOS', 'Gestão de Resíduos', 'RA', 'Taxa de reciclagem, compostagem, descarte adequado', 3),
('RA_IMPACTO_LOCAL', 'Impacto na Comunidade', 'RA', 'Emprego local, fornecedores regionais, projetos sociais', 4),
('RA_CERTIFICACOES', 'Certificações Ambientais', 'RA', 'Green Key, LEED, ISO 14001, Bandeira Azul', 5),

-- I-OE: Organização Estrutural (Governança e Infraestrutura)
('OE_GOVERNANCA', 'Governança Corporativa', 'OE', 'Estrutura decisória, compliance, transparência', 1),
('OE_INFRAESTRUTURA', 'Qualidade da Infraestrutura', 'OE', 'Estado das instalações, manutenção preventiva', 2),
('OE_TECNOLOGIA', 'Maturidade Tecnológica', 'OE', 'PMS, Channel Manager, CRM, automação', 3),
('OE_PARCERIAS', 'Rede de Parcerias', 'OE', 'OTAs, agências, operadoras, receptivos locais', 4),
('OE_FINANCEIRO', 'Saúde Financeira', 'OE', 'Liquidez, endividamento, margem operacional', 5),

-- I-AO: Ações Operacionais (Cadeia Produtiva)
('AO_OCUPACAO', 'Taxa de Ocupação', 'AO', 'Ocupação média, sazonalidade, RevPAR', 1),
('AO_SATISFACAO', 'Satisfação do Hóspede', 'AO', 'NPS, reviews online, taxa de retorno', 2),
('AO_QUALIDADE', 'Qualidade de Serviço', 'AO', 'Tempo de check-in, resolução de reclamações', 3),
('AO_CAPACITACAO', 'Capacitação da Equipe', 'AO', 'Horas de treinamento, turnover, certificações', 4),
('AO_MARKETING', 'Efetividade de Marketing', 'AO', 'CAC, ROI de campanhas, conversão direta', 5);

-- Create enterprise indicators table
CREATE TABLE public.enterprise_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.enterprise_indicator_categories(id),
  pillar TEXT NOT NULL CHECK (pillar IN ('RA', 'OE', 'AO')),
  unit TEXT,
  description TEXT,
  collection_frequency TEXT DEFAULT 'monthly',
  benchmark_min NUMERIC,
  benchmark_max NUMERIC,
  benchmark_target NUMERIC,
  weight NUMERIC DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  minimum_tier TEXT DEFAULT 'COMPLETE' CHECK (minimum_tier IN ('SMALL', 'MEDIUM', 'COMPLETE')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enterprise_indicators ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Enterprise indicators are viewable by all authenticated users"
ON public.enterprise_indicators FOR SELECT TO authenticated USING (true);

-- Admin only write access
CREATE POLICY "Admins can manage enterprise indicators"
ON public.enterprise_indicators FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Insert enterprise indicators based on hospitality industry standards
INSERT INTO public.enterprise_indicators (code, name, category_id, pillar, unit, description, benchmark_min, benchmark_max, benchmark_target, minimum_tier) VALUES
-- I-RA Indicators
('ENT_ENERGIA_KWH', 'Consumo Energético por UH', (SELECT id FROM enterprise_indicator_categories WHERE code = 'RA_SUST_ENERGIA'), 'RA', 'kWh/UH/mês', 'Consumo médio de energia elétrica por unidade habitacional ocupada', 30, 150, 60, 'SMALL'),
('ENT_ENERGIA_RENOVAVEL', '% Energia Renovável', (SELECT id FROM enterprise_indicator_categories WHERE code = 'RA_SUST_ENERGIA'), 'RA', '%', 'Percentual de energia proveniente de fontes renováveis', 0, 100, 50, 'MEDIUM'),
('ENT_AGUA_LITROS', 'Consumo de Água por Hóspede', (SELECT id FROM enterprise_indicator_categories WHERE code = 'RA_SUST_AGUA'), 'RA', 'L/hóspede/dia', 'Litros de água consumidos por hóspede por dia', 100, 500, 200, 'SMALL'),
('ENT_AGUA_REUSO', '% Água de Reuso', (SELECT id FROM enterprise_indicator_categories WHERE code = 'RA_SUST_AGUA'), 'RA', '%', 'Percentual de água reutilizada ou reciclada', 0, 100, 30, 'COMPLETE'),
('ENT_RESIDUOS_RECICLAGEM', 'Taxa de Reciclagem', (SELECT id FROM enterprise_indicator_categories WHERE code = 'RA_SUST_RESIDUOS'), 'RA', '%', 'Percentual de resíduos reciclados sobre total gerado', 0, 100, 60, 'SMALL'),
('ENT_EMPREGO_LOCAL', '% Funcionários Locais', (SELECT id FROM enterprise_indicator_categories WHERE code = 'RA_IMPACTO_LOCAL'), 'RA', '%', 'Percentual de funcionários residentes na região', 0, 100, 80, 'MEDIUM'),
('ENT_FORNECEDORES_LOCAIS', '% Compras Locais', (SELECT id FROM enterprise_indicator_categories WHERE code = 'RA_IMPACTO_LOCAL'), 'RA', '%', 'Percentual de compras de fornecedores regionais', 0, 100, 50, 'MEDIUM'),
('ENT_CERTIFICACAO_AMB', 'Nº Certificações Ambientais', (SELECT id FROM enterprise_indicator_categories WHERE code = 'RA_CERTIFICACOES'), 'RA', 'unidade', 'Quantidade de certificações ambientais ativas', 0, 5, 2, 'COMPLETE'),

-- I-OE Indicators
('ENT_COMPLIANCE', 'Índice de Compliance', (SELECT id FROM enterprise_indicator_categories WHERE code = 'OE_GOVERNANCA'), 'OE', '%', 'Conformidade com regulamentações e normas', 0, 100, 95, 'SMALL'),
('ENT_MANUTENCAO', 'Índice de Manutenção Preventiva', (SELECT id FROM enterprise_indicator_categories WHERE code = 'OE_INFRAESTRUTURA'), 'OE', '%', 'Percentual de manutenções preventivas sobre corretivas', 0, 100, 70, 'MEDIUM'),
('ENT_TECH_SCORE', 'Maturidade Digital', (SELECT id FROM enterprise_indicator_categories WHERE code = 'OE_TECNOLOGIA'), 'OE', 'score 1-5', 'Nível de automação e integração tecnológica', 1, 5, 4, 'MEDIUM'),
('ENT_PARCERIAS', 'Nº Canais de Distribuição', (SELECT id FROM enterprise_indicator_categories WHERE code = 'OE_PARCERIAS'), 'OE', 'unidade', 'Quantidade de canais ativos (OTAs, agências, etc.)', 1, 20, 8, 'SMALL'),
('ENT_MARGEM_OP', 'Margem Operacional', (SELECT id FROM enterprise_indicator_categories WHERE code = 'OE_FINANCEIRO'), 'OE', '%', 'EBITDA sobre receita operacional', -50, 50, 25, 'COMPLETE'),

-- I-AO Indicators
('ENT_OCUPACAO', 'Taxa de Ocupação', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_OCUPACAO'), 'AO', '%', 'Percentual de UHs ocupadas sobre disponíveis', 0, 100, 70, 'SMALL'),
('ENT_REVPAR', 'RevPAR', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_OCUPACAO'), 'AO', 'R$', 'Receita por UH disponível', 0, 1000, 250, 'SMALL'),
('ENT_ADR', 'Diária Média (ADR)', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_OCUPACAO'), 'AO', 'R$', 'Average Daily Rate', 0, 2000, 350, 'MEDIUM'),
('ENT_NPS', 'NPS (Net Promoter Score)', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_SATISFACAO'), 'AO', 'score -100 a 100', 'Índice de recomendação dos hóspedes', -100, 100, 50, 'SMALL'),
('ENT_REVIEW_SCORE', 'Nota Média Reviews Online', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_SATISFACAO'), 'AO', 'score 1-5', 'Média das avaliações em plataformas online', 1, 5, 4.5, 'SMALL'),
('ENT_RETORNO', 'Taxa de Retorno', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_SATISFACAO'), 'AO', '%', 'Percentual de hóspedes que retornam', 0, 100, 30, 'MEDIUM'),
('ENT_CHECKIN_TIME', 'Tempo Médio de Check-in', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_QUALIDADE'), 'AO', 'minutos', 'Tempo médio para realizar check-in', 1, 30, 5, 'MEDIUM'),
('ENT_RESOLUCAO', 'Taxa de Resolução de Reclamações', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_QUALIDADE'), 'AO', '%', 'Reclamações resolvidas satisfatoriamente', 0, 100, 90, 'MEDIUM'),
('ENT_TURNOVER', 'Turnover de Funcionários', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_CAPACITACAO'), 'AO', '%', 'Taxa anual de rotatividade de pessoal', 0, 100, 20, 'SMALL'),
('ENT_HORAS_TREINO', 'Horas de Treinamento/Funcionário', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_CAPACITACAO'), 'AO', 'horas/ano', 'Média de horas de capacitação por funcionário', 0, 100, 40, 'MEDIUM'),
('ENT_CAC', 'Custo de Aquisição de Cliente', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_MARKETING'), 'AO', 'R$', 'Custo médio para adquirir um novo hóspede', 0, 500, 80, 'COMPLETE'),
('ENT_CONVERSAO_DIRETA', '% Reservas Diretas', (SELECT id FROM enterprise_indicator_categories WHERE code = 'AO_MARKETING'), 'AO', '%', 'Percentual de reservas pelo site próprio', 0, 100, 40, 'MEDIUM');

-- Create trigger for updated_at
CREATE TRIGGER update_enterprise_indicators_updated_at
BEFORE UPDATE ON public.enterprise_indicators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();