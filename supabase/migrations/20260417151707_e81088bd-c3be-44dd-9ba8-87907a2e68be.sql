-- 1. Criar 4 treinamentos placeholder MST para temas sem cobertura existente
INSERT INTO public.edu_trainings (training_id, title, description, pillar, type, level, duration_minutes, active, created_at, updated_at)
VALUES
  ('mst-ra-tbc-001', 'Turismo de Base Comunitária: Princípios e Implementação',
   'Treinamento sobre estruturação de iniciativas de Turismo de Base Comunitária (TBC), protagonismo comunitário, governança local e cadeia produtiva inclusiva. Conteúdo a ser produzido.',
   'RA', 'course', 'INTERMEDIARIO', 240, true, now(), now()),
  ('mst-ra-sensibilizacao-001', 'Sensibilização Turística para Comunidades Receptoras',
   'Programas de sensibilização para residentes, escolas e comércio local sobre os impactos positivos e desafios do turismo no território. Conteúdo a ser produzido.',
   'RA', 'course', 'BASICO', 180, true, now(), now()),
  ('mst-ao-bigdata-001', 'Big Data e Inteligência Turística para Destinos',
   'Coleta, integração e análise de dados turísticos (demanda, fluxo, perfil, satisfação) para gestão baseada em evidências. Conteúdo a ser produzido.',
   'AO', 'course', 'AVANCADO', 300, true, now(), now()),
  ('mst-ao-digital-promo-001', 'Promoção Digital do Destino Turístico',
   'Estratégias de marketing digital, presença em OTAs, gestão de reputação online e storytelling para destinos turísticos. Conteúdo a ser produzido.',
   'AO', 'course', 'INTERMEDIARIO', 240, true, now(), now())
ON CONFLICT (training_id) DO NOTHING;

-- 2. Mapear MST aos treinamentos (usar WHERE NOT EXISTS já que não há unique constraint)
INSERT INTO public.edu_indicator_training_map (indicator_code, training_id, pillar, priority, reason_template)
SELECT v.indicator_code, v.training_id, v.pillar, v.priority, v.reason_template
FROM (VALUES
  ('MST_ACC_NBR9050', 'edu_course_acessibilidade_inclusão_e_desenho_universal_no_turismo', 'OE', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} no pilar {pillar} — acessibilidade física conforme NBR 9050.'),
  ('MST_ACC_NBR9050', 'edu_live_acessibilidade_inclusão_e_turismo', 'OE', 2,
   'Live complementar sobre acessibilidade e inclusão para reforçar a capacitação principal sobre o indicador {indicator} (Mandala MST).'),
  ('MST_5G_WIFI', 'ent-oe-tech-001', 'OE', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} — conectividade digital é base para destinos inteligentes.'),
  ('MST_5G_WIFI', 'edu_course_destinos_turísticos_inteligentes_e_governança_de_dados', 'OE', 2,
   'Capacitação sobre destinos turísticos inteligentes para apoiar o gargalo no indicador {indicator} (Mandala MST).'),
  ('MST_PNQT_QUAL', 't2-gov-020', 'OE', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} — políticas de qualificação profissional turística.'),
  ('MST_INCLUSAO_GESTAO', 'edu_course_conselhos_municipais_de_turismo_e_governança_regional', 'RA', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} — inclusão de grupos vulneráveis na governança turística.'),
  ('MST_TSE_TURNOUT', 'edu_course_regionalização_do_turismo_e_governança_intermunicipal', 'RA', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} — engajamento cívico fortalece a governança turística regional.'),
  ('MST_TBC', 'edu_course_turismo_comunitário_identidade_e_regeneração_territorial', 'RA', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} — Turismo de Base Comunitária como vetor de inclusão e regeneração.'),
  ('MST_TBC', 'edu_live_resistência_identidade_e_regeneração_o_tripé_do_turismo_comunitário', 'RA', 2,
   'Live complementar sobre TBC para reforçar a capacitação no indicador {indicator} (Mandala MST).'),
  ('MST_TBC', 'mst-ra-tbc-001', 'RA', 3,
   'Capacitação específica de implementação de TBC prescrita para o indicador {indicator} (Mandala MST).'),
  ('MST_SENSIBILIZACAO', 'mst-ra-sensibilizacao-001', 'RA', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} — programas de sensibilização da comunidade receptora.'),
  ('MST_BIGDATA', 'mst-ao-bigdata-001', 'AO', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} — gestão baseada em dados turísticos.'),
  ('MST_BIGDATA', 'edu_course_destinos_turísticos_inteligentes_e_governança_de_dados', 'AO', 2,
   'Capacitação complementar sobre governança de dados para o indicador {indicator} (Mandala MST).'),
  ('MST_DIGITAL_PROMO', 'mst-ao-digital-promo-001', 'AO', 1,
   'Esta capacitação foi prescrita porque o indicador {indicator} (Mandala MST) está {status} — promoção digital do destino.')
) AS v(indicator_code, training_id, pillar, priority, reason_template)
WHERE NOT EXISTS (
  SELECT 1 FROM public.edu_indicator_training_map m
  WHERE m.indicator_code = v.indicator_code AND m.training_id = v.training_id
);