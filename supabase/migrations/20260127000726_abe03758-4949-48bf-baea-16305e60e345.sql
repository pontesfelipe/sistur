-- Corrigir direction e min/max refs para indicadores Enterprise

-- RA - Indicadores onde MENOR é melhor (consumo)
UPDATE indicators SET direction = 'LOW_IS_BETTER', min_ref = 30, max_ref = 150
WHERE code = 'ENT_ENERGIA_KWH';

UPDATE indicators SET direction = 'LOW_IS_BETTER', min_ref = 100, max_ref = 500
WHERE code = 'ENT_AGUA_LITROS';

-- RA - Indicadores onde MAIOR é melhor (percentuais positivos)
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_ENERGIA_RENOVAVEL';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_AGUA_REUSO';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_RESIDUOS_RECICLAGEM';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_FORNECEDORES_LOCAIS';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_EMPREGO_LOCAL';
UPDATE indicators SET min_ref = 0, max_ref = 5 WHERE code = 'ENT_CERTIFICACAO_AMB';

-- OE - Indicadores normais
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_COMPLIANCE';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_MANUTENCAO';
UPDATE indicators SET min_ref = 1, max_ref = 5 WHERE code = 'ENT_TECH_SCORE';
UPDATE indicators SET min_ref = 1, max_ref = 20 WHERE code = 'ENT_PARCERIAS';
UPDATE indicators SET min_ref = -50, max_ref = 50 WHERE code = 'ENT_MARGEM_OP';
UPDATE indicators SET min_ref = 10, max_ref = 60 WHERE code = 'ENT_GOP';

-- AO - Indicadores onde MENOR é melhor
UPDATE indicators SET direction = 'LOW_IS_BETTER', min_ref = 0, max_ref = 500
WHERE code = 'ENT_CAC';

UPDATE indicators SET direction = 'LOW_IS_BETTER', min_ref = 1, max_ref = 30
WHERE code = 'ENT_CHECKIN_TIME';

UPDATE indicators SET direction = 'LOW_IS_BETTER', min_ref = 0, max_ref = 100
WHERE code = 'ENT_TURNOVER';

-- AO - Indicadores onde MAIOR é melhor
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_OCUPACAO';
UPDATE indicators SET min_ref = 0, max_ref = 1000 WHERE code = 'ENT_REVPAR';
UPDATE indicators SET min_ref = 0, max_ref = 2000 WHERE code = 'ENT_ADR';
UPDATE indicators SET min_ref = -100, max_ref = 100 WHERE code = 'ENT_NPS';
UPDATE indicators SET min_ref = 1, max_ref = 5 WHERE code = 'ENT_REVIEW_SCORE';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_RETORNO';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_RESOLUCAO';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_CONVERSAO_DIRETA';
UPDATE indicators SET min_ref = 0, max_ref = 100 WHERE code = 'ENT_HORAS_TREINO';