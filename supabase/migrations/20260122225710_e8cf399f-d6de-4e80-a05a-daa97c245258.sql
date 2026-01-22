-- Update indicators to have proper minimum_tier distribution
-- Essential tier (SMALL): Core indicators that every destination should track
UPDATE indicators SET minimum_tier = 'SMALL' WHERE code IN (
  -- RA essentials
  'RA001', -- Cobertura de Áreas Protegidas
  'RA002', -- Índice de Qualidade da Água
  'RA005', -- PIB Per Capita Municipal
  -- OE essentials
  'OE001', -- Leitos de Hospedagem
  'OE006', -- Orçamento Municipal para Turismo
  'OE007', -- Existência de Plano de Turismo
  -- AO essentials
  'AO001', -- Fluxo Turístico Anual
  'AO002', -- Taxa de Ocupação Hoteleira
  'AO007'  -- Satisfação do Turista
);

-- Strategic tier (MEDIUM): Additional important indicators
UPDATE indicators SET minimum_tier = 'MEDIUM' WHERE code IN (
  -- RA medium
  'RA003', -- Patrimônios Culturais Registrados
  'RA004', -- Diversidade de Manifestações Culturais
  'RA007', -- Índice de Participação Social
  -- OE medium  
  'OE003', -- Conectividade Aérea
  'OE004', -- Agências de Turismo Cadastradas
  'OE005', -- Guias de Turismo Cadastrados
  -- AO medium
  'AO003', -- Permanência Média
  'AO004', -- Receita Turística Estimada
  'AO005', -- Diversificação de Segmentos
  'AO006'  -- Eventos Turísticos Anuais
);

-- All IGMA indicators stay as COMPLETE (integral) tier by default