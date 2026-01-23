-- Adicionar mapeamento de treinamento para ENT_GOP
INSERT INTO edu_indicator_training_map (indicator_code, training_id, pillar, priority, reason_template)
VALUES (
  'ENT_GOP',
  'ent-oe-financeiro-001',
  'OE',
  1,
  'O indicador de lucratividade operacional está {status}. Este treinamento aborda gestão financeira hoteleira.'
);