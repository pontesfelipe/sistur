-- Pacote Dados Enterprise — passo (a): migrar indicadores que só existiam em
-- src/data/enterpriseIndicatorGuidance.ts para a tabela canônica `indicators`
-- (escopo enterprise), de modo que entrem no engine de cálculo e no relatório.

-- Helper: pega o id da categoria Enterprise pelo código
DO $$
DECLARE
  cat_oe_gov uuid;
  cat_oe_fin uuid;
  cat_oe_tec uuid;
  cat_ao_qual uuid;
  cat_ao_sat uuid;
  cat_ra_ene uuid;
  cat_ra_res uuid;
  cat_ra_loc uuid;
BEGIN
  SELECT id INTO cat_oe_gov FROM public.enterprise_indicator_categories WHERE code='OE_GOVERNANCA';
  SELECT id INTO cat_oe_fin FROM public.enterprise_indicator_categories WHERE code='OE_FINANCEIRO';
  SELECT id INTO cat_oe_tec FROM public.enterprise_indicator_categories WHERE code='OE_TECNOLOGIA';
  SELECT id INTO cat_ao_qual FROM public.enterprise_indicator_categories WHERE code='AO_QUALIDADE';
  SELECT id INTO cat_ao_sat FROM public.enterprise_indicator_categories WHERE code='AO_SATISFACAO';
  SELECT id INTO cat_ra_ene FROM public.enterprise_indicator_categories WHERE code='RA_SUST_ENERGIA';
  SELECT id INTO cat_ra_res FROM public.enterprise_indicator_categories WHERE code='RA_SUST_RESIDUOS';
  SELECT id INTO cat_ra_loc FROM public.enterprise_indicator_categories WHERE code='RA_IMPACTO_LOCAL';

  INSERT INTO public.indicators (
    code, name, pillar, theme, description, unit,
    direction, normalization, min_ref, max_ref, weight,
    indicator_scope, enterprise_category_id,
    benchmark_min, benchmark_max, benchmark_target,
    collection_type, minimum_tier
  )
  VALUES
    -- Governança / Conformidade
    ('ENT_LEGAL_DOCS','Documentos Legais Ativos','OE','Governança Corporativa',
     'Quantidade de documentos legais ativos (Alvará, CNPJ, CADASTUR, licenças ambientais, AVCB, certificados sanitários).',
     'unidade','HIGH_IS_BETTER','MIN_MAX',0,10,1.0,
     'enterprise',cat_oe_gov,0,10,6,'MANUAL','MEDIUM'),

    ('ENT_SEASONALITY','Índice de Sazonalidade','OE','Governança Corporativa',
     'Variação entre alta e baixa temporada calculada como ((ocupação_alta − ocupação_baixa) ÷ ocupação_média) × 100. Quanto menor, mais estável a operação.',
     '%','LOW_IS_BETTER','MIN_MAX',0,150,1.0,
     'enterprise',cat_oe_gov,0,150,40,'MANUAL','MEDIUM'),

    ('ENT_STAFF_RATIO','Funcionários por UH','OE','Governança Corporativa',
     'Total de funcionários (efetivos + terceirizados) dividido pelo número de quartos (UHs). Indicador de eficiência operacional.',
     'ratio','LOW_IS_BETTER','MIN_MAX',0.2,2.5,1.0,
     'enterprise',cat_oe_gov,0.2,2.5,0.8,'MANUAL','MEDIUM'),

    -- Financeiro avançado
    ('ENT_GOPPAR','GOPPAR (Lucro Operacional por UH disponível)','OE','Saúde Financeira',
     'Gross Operating Profit Per Available Room: lucro operacional bruto dividido por quartos disponíveis no período.',
     'R$','HIGH_IS_BETTER','MIN_MAX',0,1000,1.0,
     'enterprise',cat_oe_fin,0,1000,200,'MANUAL','COMPLETE'),

    ('ENT_TREVPAR','TRevPAR (Receita Total por UH disponível)','OE','Saúde Financeira',
     'Total Revenue Per Available Room: receita total (hospedagem + A&B + eventos + spa + outros) dividida por quartos disponíveis.',
     'R$','HIGH_IS_BETTER','MIN_MAX',0,1500,1.0,
     'enterprise',cat_oe_fin,0,1500,400,'MANUAL','COMPLETE'),

    -- Tecnologia / Digital
    ('ENT_DIGITAL_CHECKIN','% Check-in Digital','OE','Maturidade Tecnológica',
     'Percentual de check-ins realizados digitalmente (auto-check-in, app, QR code) sobre o total de check-ins.',
     '%','HIGH_IS_BETTER','MIN_MAX',0,100,1.0,
     'enterprise',cat_oe_tec,0,100,40,'MANUAL','MEDIUM'),

    -- Reviews / Reputação
    ('ENT_REVIEW_VOL','Volume de Reviews Online','AO','Satisfação do Hóspede',
     'Total agregado de avaliações em Google Maps, TripAdvisor, Booking e Expedia.',
     'unidade','HIGH_IS_BETTER','MIN_MAX',0,2000,1.0,
     'enterprise',cat_ao_sat,0,2000,500,'MANUAL','SMALL'),

    ('ENT_RESPONSE_RATE','% Resposta a Reviews','AO','Qualidade de Serviço',
     'Percentual de avaliações respondidas pela gerência nas plataformas online.',
     '%','HIGH_IS_BETTER','MIN_MAX',0,100,1.0,
     'enterprise',cat_ao_qual,0,100,80,'MANUAL','SMALL'),

    -- Satisfação avançada
    ('ENT_GUEST_SATISFACTION','Satisfação Interna do Hóspede','AO','Satisfação do Hóspede',
     'Média das pesquisas internas de satisfação (escala 0–10) coletadas via formulários pós-estadia, QR no quarto ou plataformas como ReviewPro.',
     'score 0-10','HIGH_IS_BETTER','MIN_MAX',0,10,1.0,
     'enterprise',cat_ao_sat,0,10,8.5,'MANUAL','MEDIUM'),

    ('ENT_REPEAT_GUEST','% Hóspedes Recorrentes','AO','Satisfação do Hóspede',
     'Percentual de hóspedes que já se hospedaram anteriormente sobre o total de hóspedes únicos no período.',
     '%','HIGH_IS_BETTER','MIN_MAX',0,80,1.0,
     'enterprise',cat_ao_sat,0,80,30,'MANUAL','MEDIUM'),

    -- ESG / Sustentabilidade avançada
    ('ENT_ENERGY','Consumo Energético por Pernoite','RA','Eficiência Energética',
     'kWh totais consumidos divididos pelo número de pernoites. Complementa ENT_ENERGIA_KWH (por UH/mês) com base operacional real.',
     'kWh/pernoite','LOW_IS_BETTER','MIN_MAX',2,30,1.0,
     'enterprise',cat_ra_ene,2,30,8,'MANUAL','MEDIUM'),

    ('ENT_CARBON','Pegada de Carbono por Pernoite','RA','Eficiência Energética',
     'kgCO2e por pernoite (escopos 1 e 2 — GHG Protocol). Considera energia, combustível e gases refrigerantes.',
     'kgCO2e/pernoite','LOW_IS_BETTER','MIN_MAX',5,50,1.0,
     'enterprise',cat_ra_ene,5,50,15,'MANUAL','COMPLETE'),

    ('ENT_WASTE','Resíduos Gerados por Pernoite','RA','Gestão de Resíduos',
     'Peso total de resíduos (kg) dividido pelo número de pernoites.',
     'kg/pernoite','LOW_IS_BETTER','MIN_MAX',0.1,3,1.0,
     'enterprise',cat_ra_res,0.1,3,0.6,'MANUAL','MEDIUM'),

    -- Acessibilidade / Impacto local
    ('ENT_ACCESSIBLE_ROOMS','% Quartos Acessíveis','RA','Impacto na Comunidade',
     'Percentual de quartos adaptados conforme ABNT NBR 9050 (barras, portas largas, banheiro adaptado) sobre o total de UHs.',
     '%','HIGH_IS_BETTER','MIN_MAX',0,30,1.0,
     'enterprise',cat_ra_loc,0,30,7,'MANUAL','MEDIUM')
  ON CONFLICT (code) DO NOTHING;
END $$;