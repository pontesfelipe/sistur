
-- ============================================
-- MANDALA DA SUSTENTABILIDADE NO TURISMO (MST)
-- ============================================

ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS is_mandala_extension BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.indicators.is_mandala_extension IS
'Indica se este indicador faz parte da expansão Mandala da Sustentabilidade no Turismo (MST). Indicadores opt-in, ativados apenas quando assessment.expand_with_mandala = true.';

ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS expand_with_mandala BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.assessments.expand_with_mandala IS
'Quando true, o diagnóstico inclui os indicadores da Mandala da Sustentabilidade no Turismo (MST_*).';

CREATE INDEX IF NOT EXISTS idx_indicators_mandala
ON public.indicators(pillar)
WHERE is_mandala_extension = true;

-- ============================================
-- SEED dos 9 indicadores MST
-- ============================================

INSERT INTO public.indicators (
  org_id, code, name, pillar, theme, description, unit,
  direction, normalization, min_ref, max_ref, weight,
  data_source, collection_type, source, criticality,
  integration_available, calculation_cost, indicator_scope,
  minimum_tier, is_mandala_extension, notes
) VALUES
-- ===== RA — Relações Ambientais =====
(NULL, 'MST_TSE_TURNOUT', 'Comparecimento Eleitoral', 'RA',
 'Participação Cívica',
 'Percentual de eleitores que compareceram às últimas eleições municipais. Indica engajamento político da comunidade — base para governança turística participativa (Mandala MST).',
 '%', 'HIGH_IS_BETTER', 'MIN_MAX', 50, 90, 0.4,
 'OUTRO', 'AUTOMATICA', 'TSE — Tribunal Superior Eleitoral',
 'medium', true, 'low', 'territorial', 'MEDIUM', true,
 'Fonte: dadosabertos.tse.jus.br. Calculado por município nas últimas eleições municipais.'),

(NULL, 'MST_TBC', 'Iniciativas de Turismo de Base Comunitária', 'RA',
 'Inclusão Comunitária',
 'Número de iniciativas formais de Turismo de Base Comunitária (TBC) ativas no município. Mede protagonismo comunitário no turismo (Mandala MST).',
 'unidades', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 10, 0.3,
 'MANUAL', 'MANUAL', 'Cadastro local / Secretaria de Turismo',
 'medium', false, 'medium', 'territorial', 'COMPLETE', true,
 'Indicador qualitativo. Coletado via formulário pelo gestor local.'),

(NULL, 'MST_INCLUSAO_GESTAO', 'Inclusão na Gestão Turística', 'RA',
 'Inclusão Social',
 'Percentual de mulheres, pessoas negras e de outras minorias em cargos de liderança da gestão pública do turismo (Sec. Turismo, COMTUR). Mede equidade na governança (Mandala MST).',
 '%', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 60, 0.3,
 'MANUAL', 'MANUAL', 'Secretaria Municipal de Turismo',
 'medium', false, 'low', 'territorial', 'COMPLETE', true,
 'Coleta manual via questionário ao gestor.'),

(NULL, 'MST_SENSIBILIZACAO', 'Programas de Sensibilização Turística', 'RA',
 'Educação para o Turismo',
 'Existência e abrangência de programas de educação patrimonial, ambiental e proteção à criança/adolescente (ECA) vinculados ao turismo. Score 0–4.',
 'score 0-4', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 4, 0.3,
 'MANUAL', 'MANUAL', 'Secretaria de Educação / Turismo',
 'medium', false, 'low', 'territorial', 'COMPLETE', true,
 'Avaliação qualitativa: 0=nenhum, 1=esporádico, 2=anual, 3=permanente, 4=consolidado e avaliado.'),

-- ===== OE — Organização Estrutural =====
(NULL, 'MST_ACC_NBR9050', 'Acessibilidade Física (NBR 9050)', 'OE',
 'Infraestrutura Inclusiva',
 'Percentual de equipamentos turísticos cadastrados com acessibilidade física conforme NBR 9050. Mede inclusão de pessoas com deficiência (Mandala MST).',
 '%', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 80, 0.4,
 'CADASTUR', 'AUTOMATICA', 'CADASTUR — Ministério do Turismo',
 'medium', true, 'low', 'territorial', 'MEDIUM', true,
 'Calculado a partir do CADASTUR: equipamentos com flag de acessibilidade / total de equipamentos.'),

(NULL, 'MST_PNQT_QUAL', 'Qualificação Profissional PNQT', 'OE',
 'Capacitação Profissional',
 'Número de profissionais do turismo qualificados conforme o Programa Nacional de Qualificação do Turismo (PNQT) por mil habitantes.',
 'por 1000 hab', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 5, 0.4,
 'CADASTUR', 'AUTOMATICA', 'CADASTUR — Profissionais',
 'medium', true, 'low', 'territorial', 'MEDIUM', true,
 'Fonte: CADASTUR (Guias + Profissionais). Normalizado por população IBGE.'),

(NULL, 'MST_5G_WIFI', 'Conectividade Digital Turística', 'OE',
 'Infraestrutura Tecnológica',
 'Cobertura combinada de 5G/4G e Wi-Fi público em áreas turísticas. Score 0–100 baseado em dados Anatel.',
 'score 0-100', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 100, 0.3,
 'OUTRO', 'AUTOMATICA', 'Anatel — Agência Nacional de Telecomunicações',
 'medium', true, 'low', 'territorial', 'MEDIUM', true,
 'Fonte: dados.anatel.gov.br. Combina cobertura 5G + 4G + Wi-Fi público.'),

-- ===== AO — Ações Operacionais =====
(NULL, 'MST_DIGITAL_PROMO', 'Promoção Digital do Destino', 'AO',
 'Marketing Digital',
 'Score de presença digital ativa do destino: site oficial, redes sociais, campanhas. Score 0–4.',
 'score 0-4', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 4, 0.3,
 'MANUAL', 'MANUAL', 'Secretaria de Turismo / COMTUR',
 'medium', false, 'low', 'territorial', 'COMPLETE', true,
 'Avaliação: 0=ausente, 1=site básico, 2=redes ativas, 3=campanhas regulares, 4=estratégia integrada com métricas.'),

(NULL, 'MST_BIGDATA', 'Gestão Baseada em Dados (Big Data Turístico)', 'AO',
 'Inteligência Turística',
 'Existência de painel de Business Intelligence ou observatório turístico para tomada de decisão baseada em dados. Score 0–3.',
 'score 0-3', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 3, 0.3,
 'MANUAL', 'MANUAL', 'Secretaria de Turismo / Observatório',
 'medium', false, 'low', 'territorial', 'COMPLETE', true,
 'Avaliação: 0=nenhum, 1=relatórios manuais, 2=painel BI básico, 3=observatório consolidado.')
ON CONFLICT DO NOTHING;
