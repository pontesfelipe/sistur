
INSERT INTO public.edu_indicator_training_map (indicator_code, training_id, pillar, status_trigger, priority, reason_template) VALUES
-- RA
('ENT_CARBON','ent-ra-energia-001','RA','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a pegada de carbono está em nível {status}. Curso foca em eficiência energética para reduzir emissões.'),
('ENT_ENERGY','ent-ra-energia-001','RA','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque o consumo energético está em nível {status}. Curso aborda redução de consumo por pernoite.'),
('ENT_WASTE','ent-ra-residuos-001','RA','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a geração de resíduos está em nível {status}. Curso ensina práticas de redução e reciclagem.'),
('ENT_ACCESSIBLE_ROOMS','ent-oe-compliance-001','RA','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque o % de quartos acessíveis está em nível {status}. Curso aborda conformidade legal (NBR 9050).'),
('ENT_SUSTENTABILIDADE','ent-ra-cert-001','RA','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque os sinais externos de sustentabilidade estão em nível {status}. Curso prepara para certificação ambiental.'),
('ENT_SUSTENTABILIDADE_SCORE','ent-ra-cert-001','RA','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque o score de sustentabilidade está em nível {status}. Curso prepara para certificação ambiental.'),
-- OE
('ENT_GOPPAR','ent-oe-financeiro-001','OE','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque o GOPPAR está em nível {status}. Curso de gestão financeira aborda margem operacional por UH.'),
('ENT_TREVPAR','ent-oe-financeiro-001','OE','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque o TRevPAR está em nível {status}. Curso aborda receita total por UH disponível.'),
('ENT_DIGITAL_CHECKIN','ent-oe-tech-001','OE','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque o % de check-in digital está em nível {status}. Curso de transformação digital aborda automação operacional.'),
('ENT_STAFF_RATIO','ent-oe-financeiro-001','OE','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque a relação funcionários/UH está em nível {status}. Curso aborda dimensionamento de equipe.'),
('ENT_LEGAL_DOCS','ent-oe-compliance-001','OE','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque os documentos legais ativos estão em nível {status}. Curso de compliance aborda licenças obrigatórias.'),
('ENT_COMPLIANCE_RATE','ent-oe-compliance-001','OE','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a taxa de conformidade legal está em nível {status}. Curso de compliance e governança.'),
('ENT_SEASONALITY','ent-ao-revpar-001','OE','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque o índice de sazonalidade está em nível {status}. Revenue management aborda estratégias para suavizar curva de demanda.'),
('ENT_SEGURANCA_SCORE','ent-oe-compliance-001','OE','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque o score de segurança está em nível {status}. Curso aborda governança e protocolos.'),
-- AO
('ENT_AVAL_GOOGLE','ent-ao-review-001','AO','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a avaliação Google está em nível {status}. Curso de reputação online aborda gestão de reviews.'),
('ENT_REVIEW_VOL','ent-ao-review-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque o volume de reviews está em nível {status}. Curso aborda como estimular avaliações de hóspedes.'),
('ENT_RESPONSE_RATE','ent-ao-review-001','AO','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a taxa de resposta a reviews está em nível {status}. Curso ensina protocolo de resposta.'),
('ENT_REPUTACAO_CONSOLIDADA','ent-ao-review-001','AO','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a reputação consolidada multi-canal está em nível {status}. Curso aborda gestão integrada de OTAs.'),
('ENT_REPUTACAO_PUBLICA','ent-ao-reclamacao-001','AO','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a reputação pública (Reclame Aqui/Procon) está em nível {status}. Curso aborda service recovery.'),
('ENT_TAXA_SOLUCAO','ent-ao-reclamacao-001','AO','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a taxa de solução de reclamações públicas está em nível {status}. Curso ensina protocolos de resolução.'),
('ENT_TAXA_SOLUCAO_RECLAMACOES','ent-ao-reclamacao-001','AO','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a taxa de solução de reclamações está em nível {status}. Curso aborda service recovery.'),
('ENT_REPEAT_GUEST','ent-ao-nps-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque o % de hóspedes recorrentes está em nível {status}. Curso de NPS aborda fidelização.'),
('ENT_GUEST_SATISFACTION','ent-ao-nps-001','AO','["CRITICO","MODERADO"]'::jsonb,1,'Prescrito porque a satisfação do hóspede está em nível {status}. Curso de NPS aborda medição e ação.'),
('ENT_DIARIA_MEDIA','ent-ao-revpar-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque a diária média derivada está em nível {status}. Revenue management aborda precificação.'),
('ENT_INDICE_PRECO','ent-ao-revpar-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque o índice de preço relativo está em nível {status}. Revenue management aborda posicionamento.'),
('ENT_POSICAO_PRECO','ent-ao-revpar-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque o posicionamento de preço vs concorrência está em nível {status}. Revenue management aborda estratégia competitiva.'),
('ENT_SAZONALIDADE_TARIFARIA','ent-ao-revpar-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque a amplitude tarifária sazonal está em nível {status}. Revenue management aborda yield management.'),
('ENT_FORCA_MARCA','ent-ao-review-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque a força de marca está em nível {status}. Curso aborda reputação como ativo de marca.'),
('ENT_PRESENCA_DIGITAL','ent-oe-tech-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque a presença digital está em nível {status}. Curso de transformação digital aborda canais.'),
('ENT_PRESENCA_WEB','ent-oe-tech-001','AO','["CRITICO","MODERADO"]'::jsonb,2,'Prescrito porque a presença web está em nível {status}. Curso aborda site, SEO e canais próprios.')
ON CONFLICT DO NOTHING;
