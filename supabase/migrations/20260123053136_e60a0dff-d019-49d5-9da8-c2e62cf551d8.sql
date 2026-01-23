-- Add hospitality-specific trainings for enterprise diagnostic prescriptions

-- First insert the trainings (using DO NOTHING since training_id is PK)
INSERT INTO edu_trainings (training_id, title, type, pillar, level, description, objective, target_audience, duration_minutes, active, status, slug)
VALUES
  -- AO - Satisfação do Hóspede
  ('ent-ao-nps-001', 'NPS na Hotelaria: Da Medição à Ação', 'course', 'AO', 'Intermediário', 
   'Como implementar, mensurar e transformar o NPS em ações de melhoria contínua na experiência do hóspede.',
   'Dominar a metodologia NPS e criar planos de ação baseados em feedback.', 
   'Gerentes de hotel, coordenadores de guest experience, recepcionistas', 120, true, 'published', 'ent-ao-nps-001'),
  
  ('ent-ao-review-001', 'Gestão de Reputação Online em Hotelaria', 'course', 'AO', 'Intermediário',
   'Estratégias para monitorar, responder e melhorar avaliações em OTAs, TripAdvisor e Google.',
   'Implementar gestão proativa de reputação digital e aumentar scores de reviews.',
   'Gestores hoteleiros, equipe de marketing, recepção', 90, true, 'published', 'ent-ao-review-001'),

  ('ent-ao-revpar-001', 'Revenue Management para Hotéis', 'course', 'AO', 'Avançado',
   'Estratégias de precificação dinâmica, gestão de inventário e maximização de RevPAR.',
   'Aplicar técnicas de revenue management para otimizar receita por UH.',
   'Revenue managers, gerentes gerais, proprietários', 180, true, 'published', 'ent-ao-revpar-001'),

  ('ent-ao-ocupacao-001', 'Estratégias de Vendas e Ocupação Hoteleira', 'course', 'AO', 'Intermediário',
   'Canais de distribuição, parcerias com OTAs, vendas diretas e sazonalidade.',
   'Desenvolver estratégias multicanal para aumentar ocupação.',
   'Equipe comercial, recepção, gerentes', 120, true, 'published', 'ent-ao-ocupacao-001'),

  ('ent-ao-checkin-001', 'Excelência no Check-in e Check-out', 'course', 'AO', 'Básico',
   'Processos eficientes de recepção, first impression e despedida memorável.',
   'Reduzir tempo de check-in e elevar satisfação no primeiro contato.',
   'Recepcionistas, concierge, front office', 60, true, 'published', 'ent-ao-checkin-001'),

  ('ent-ao-reclamacao-001', 'Gestão de Reclamações e Service Recovery', 'course', 'AO', 'Intermediário',
   'Transformando problemas em oportunidades: técnicas de service recovery na hotelaria.',
   'Resolver reclamações de forma eficaz e converter hóspedes insatisfeitos em promotores.',
   'Toda equipe operacional, gerência', 90, true, 'published', 'ent-ao-reclamacao-001'),

  ('ent-ao-turnover-001', 'Retenção de Talentos em Hotelaria', 'course', 'AO', 'Intermediário',
   'Estratégias para reduzir turnover: cultura organizacional, desenvolvimento e reconhecimento.',
   'Implementar programas de retenção e reduzir rotatividade de funcionários.',
   'RH, gerentes de departamento, lideranças', 120, true, 'published', 'ent-ao-turnover-001'),

  ('ent-ao-treino-001', 'Programa de Treinamento Contínuo em Hotéis', 'course', 'AO', 'Intermediário',
   'Como estruturar programas de capacitação on-the-job, e-learning e desenvolvimento.',
   'Criar e implementar programa de treinamento estruturado.',
   'RH, gerentes, trainers internos', 90, true, 'published', 'ent-ao-treino-001'),

  ('ent-ao-diretas-001', 'Estratégias de Reservas Diretas', 'course', 'AO', 'Intermediário',
   'Reduzindo dependência de OTAs: website, booking engine, fidelização e remarketing.',
   'Aumentar percentual de reservas diretas e reduzir CAC.',
   'Marketing, comercial, e-commerce', 120, true, 'published', 'ent-ao-diretas-001'),

  ('ent-oe-compliance-001', 'Compliance e Governança Hoteleira', 'course', 'OE', 'Avançado',
   'Estruturas de governança, políticas internas, compliance e gestão de riscos.',
   'Implementar framework de governança e compliance em meios de hospedagem.',
   'Diretores, proprietários, controllers', 150, true, 'published', 'ent-oe-compliance-001'),

  ('ent-oe-manutencao-001', 'Manutenção Preventiva em Hotelaria', 'course', 'OE', 'Intermediário',
   'Planejamento de manutenção preventiva, gestão de facilities e conservação.',
   'Implementar programa de manutenção que previna falhas e reduza custos.',
   'Manutenção, governança, gerência', 90, true, 'published', 'ent-oe-manutencao-001'),

  ('ent-oe-tech-001', 'Transformação Digital em Hotéis', 'course', 'OE', 'Intermediário',
   'PMS, Channel Manager, CRM, automação e tecnologias emergentes na hotelaria.',
   'Avaliar maturidade digital e implementar melhorias tecnológicas.',
   'TI, gerência, operações', 120, true, 'published', 'ent-oe-tech-001'),

  ('ent-oe-parcerias-001', 'Gestão de Canais e Parcerias na Hotelaria', 'course', 'OE', 'Intermediário',
   'OTAs, operadoras, agências, receptivos: estratégias de parceria e negociação.',
   'Diversificar e otimizar canais de distribuição e parcerias.',
   'Comercial, revenue, gerência', 90, true, 'published', 'ent-oe-parcerias-001'),

  ('ent-oe-financeiro-001', 'Gestão Financeira para Hotéis', 'course', 'OE', 'Avançado',
   'Análise de indicadores financeiros, margem operacional, fluxo de caixa e investimentos.',
   'Melhorar saúde financeira através de análise e controle de indicadores-chave.',
   'Controllers, gerentes, proprietários', 150, true, 'published', 'ent-oe-financeiro-001'),

  ('ent-ra-energia-001', 'Eficiência Energética em Hotelaria', 'course', 'RA', 'Intermediário',
   'Redução de consumo, energias renováveis, automação e certificações.',
   'Implementar programa de eficiência energética e reduzir custos.',
   'Manutenção, facilities, sustentabilidade', 120, true, 'published', 'ent-ra-energia-001'),

  ('ent-ra-agua-001', 'Gestão Hídrica Sustentável em Hotéis', 'course', 'RA', 'Intermediário',
   'Redução de consumo, reuso, captação pluvial e conscientização.',
   'Implementar programa de gestão hídrica sustentável.',
   'Manutenção, governança, sustentabilidade', 90, true, 'published', 'ent-ra-agua-001'),

  ('ent-ra-residuos-001', 'Gestão de Resíduos em Meios de Hospedagem', 'course', 'RA', 'Intermediário',
   'Separação, reciclagem, compostagem e economia circular na hotelaria.',
   'Implementar programa de gestão de resíduos e aumentar taxa de reciclagem.',
   'Governança, manutenção, sustentabilidade', 90, true, 'published', 'ent-ra-residuos-001'),

  ('ent-ra-local-001', 'Turismo de Base Local para Hotéis', 'course', 'RA', 'Intermediário',
   'Parcerias com fornecedores locais, empregabilidade regional e projetos comunitários.',
   'Aumentar impacto positivo na comunidade local.',
   'Gerência, RH, compras', 90, true, 'published', 'ent-ra-local-001'),

  ('ent-ra-cert-001', 'Certificações Ambientais na Hotelaria', 'course', 'RA', 'Avançado',
   'Green Key, LEED, ISO 14001: requisitos, implementação e benefícios.',
   'Preparar hotel para obter certificações ambientais reconhecidas.',
   'Sustentabilidade, gerência, qualidade', 150, true, 'published', 'ent-ra-cert-001')

ON CONFLICT (training_id) DO NOTHING;

-- Delete existing mappings for ENT_ indicators to avoid duplicates
DELETE FROM edu_indicator_training_map WHERE indicator_code LIKE 'ENT_%';

-- Create mappings from enterprise indicators to hospitality courses
INSERT INTO edu_indicator_training_map (indicator_code, training_id, pillar, priority, reason_template, status_trigger)
VALUES
  ('ENT_NPS', 'ent-ao-nps-001', 'AO', 1, 'Prescrito porque o indicador NPS está em nível {status}. Capacitação focada em transformar feedback em ações.', '["CRITICO","MODERADO"]'),
  ('ENT_REVIEW_SCORE', 'ent-ao-review-001', 'AO', 1, 'Prescrito porque a nota de reviews online está {status}. Curso de gestão de reputação digital.', '["CRITICO","MODERADO"]'),
  ('ENT_RETORNO', 'ent-ao-nps-001', 'AO', 2, 'Prescrito porque a taxa de retorno está {status}. Foco em experiência e fidelização.', '["CRITICO","MODERADO"]'),
  ('ENT_REVPAR', 'ent-ao-revpar-001', 'AO', 1, 'Prescrito porque o RevPAR está {status}. Capacitação em revenue management avançado.', '["CRITICO","MODERADO"]'),
  ('ENT_ADR', 'ent-ao-revpar-001', 'AO', 2, 'Prescrito porque a diária média (ADR) está {status}. Estratégias de precificação.', '["CRITICO","MODERADO"]'),
  ('ENT_OCUPACAO', 'ent-ao-ocupacao-001', 'AO', 1, 'Prescrito porque a taxa de ocupação está {status}. Estratégias de vendas multicanal.', '["CRITICO","MODERADO"]'),
  ('ENT_CHECKIN_TIME', 'ent-ao-checkin-001', 'AO', 1, 'Prescrito porque o tempo de check-in está {status}. Melhoria de processos de recepção.', '["CRITICO","MODERADO"]'),
  ('ENT_RESOLUCAO', 'ent-ao-reclamacao-001', 'AO', 1, 'Prescrito porque a taxa de resolução de reclamações está {status}. Capacitação em service recovery.', '["CRITICO","MODERADO"]'),
  ('ENT_TURNOVER', 'ent-ao-turnover-001', 'AO', 1, 'Prescrito porque o turnover está {status}. Estratégias de retenção de talentos.', '["CRITICO","MODERADO"]'),
  ('ENT_HORAS_TREINO', 'ent-ao-treino-001', 'AO', 1, 'Prescrito porque as horas de treinamento estão {status}. Programa de capacitação contínua.', '["CRITICO","MODERADO"]'),
  ('ENT_CONVERSAO_DIRETA', 'ent-ao-diretas-001', 'AO', 1, 'Prescrito porque o % de reservas diretas está {status}. Redução de dependência de OTAs.', '["CRITICO","MODERADO"]'),
  ('ENT_CAC', 'ent-ao-diretas-001', 'AO', 2, 'Prescrito porque o CAC está {status}. Otimização de aquisição de clientes.', '["CRITICO","MODERADO"]'),
  ('ENT_COMPLIANCE', 'ent-oe-compliance-001', 'OE', 1, 'Prescrito porque o índice de compliance está {status}. Estruturação de governança.', '["CRITICO","MODERADO"]'),
  ('ENT_MANUTENCAO', 'ent-oe-manutencao-001', 'OE', 1, 'Prescrito porque o índice de manutenção está {status}. Programa de manutenção preventiva.', '["CRITICO","MODERADO"]'),
  ('ENT_TECH_SCORE', 'ent-oe-tech-001', 'OE', 1, 'Prescrito porque a maturidade digital está {status}. Transformação digital hoteleira.', '["CRITICO","MODERADO"]'),
  ('ENT_PARCERIAS', 'ent-oe-parcerias-001', 'OE', 1, 'Prescrito porque o nº de canais de distribuição está {status}. Diversificação de parcerias.', '["CRITICO","MODERADO"]'),
  ('ENT_MARGEM_OP', 'ent-oe-financeiro-001', 'OE', 1, 'Prescrito porque a margem operacional está {status}. Gestão financeira estratégica.', '["CRITICO","MODERADO"]'),
  ('ENT_ENERGIA_KWH', 'ent-ra-energia-001', 'RA', 1, 'Prescrito porque o consumo energético está {status}. Programa de eficiência energética.', '["CRITICO","MODERADO"]'),
  ('ENT_ENERGIA_RENOVAVEL', 'ent-ra-energia-001', 'RA', 2, 'Prescrito porque o % de energia renovável está {status}. Transição energética sustentável.', '["CRITICO","MODERADO"]'),
  ('ENT_AGUA_LITROS', 'ent-ra-agua-001', 'RA', 1, 'Prescrito porque o consumo de água está {status}. Gestão hídrica sustentável.', '["CRITICO","MODERADO"]'),
  ('ENT_AGUA_REUSO', 'ent-ra-agua-001', 'RA', 2, 'Prescrito porque o % de reuso de água está {status}. Implementação de reuso.', '["CRITICO","MODERADO"]'),
  ('ENT_RESIDUOS_RECICLAGEM', 'ent-ra-residuos-001', 'RA', 1, 'Prescrito porque a taxa de reciclagem está {status}. Gestão de resíduos circular.', '["CRITICO","MODERADO"]'),
  ('ENT_FORNECEDORES_LOCAIS', 'ent-ra-local-001', 'RA', 1, 'Prescrito porque o % de compras locais está {status}. Fortalecimento da cadeia local.', '["CRITICO","MODERADO"]'),
  ('ENT_EMPREGO_LOCAL', 'ent-ra-local-001', 'RA', 2, 'Prescrito porque o % de funcionários locais está {status}. Empregabilidade regional.', '["CRITICO","MODERADO"]'),
  ('ENT_CERTIFICACAO_AMB', 'ent-ra-cert-001', 'RA', 1, 'Prescrito porque o nº de certificações ambientais está {status}. Preparação para certificação.', '["CRITICO","MODERADO"]');