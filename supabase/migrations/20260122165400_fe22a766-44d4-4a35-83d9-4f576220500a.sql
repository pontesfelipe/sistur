-- Create diagnosis tier enum
CREATE TYPE public.diagnosis_tier_type AS ENUM ('COMPLETE', 'MEDIUM', 'SMALL');

-- Add minimum_tier column to indicators table
-- This defines the minimum tier level that requires this indicator
-- SMALL = indicator is required for all tiers (core essentials)
-- MEDIUM = indicator is required for MEDIUM and COMPLETE tiers
-- COMPLETE = indicator is only required for COMPLETE tier
ALTER TABLE public.indicators ADD COLUMN minimum_tier public.diagnosis_tier_type DEFAULT 'COMPLETE';

-- Add tier column to assessments table
ALTER TABLE public.assessments ADD COLUMN tier public.diagnosis_tier_type DEFAULT 'COMPLETE';

-- Add criticality and integration_available to indicators for tier classification
ALTER TABLE public.indicators ADD COLUMN criticality text DEFAULT 'medium' CHECK (criticality IN ('high', 'medium', 'low'));
ALTER TABLE public.indicators ADD COLUMN integration_available boolean DEFAULT false;
ALTER TABLE public.indicators ADD COLUMN calculation_cost text DEFAULT 'medium' CHECK (calculation_cost IN ('high', 'medium', 'low'));

-- Add comments for documentation
COMMENT ON COLUMN public.indicators.minimum_tier IS 'Tier mínimo que requer este indicador: SMALL (essencial), MEDIUM (núcleo + crítico), COMPLETE (todos)';
COMMENT ON COLUMN public.indicators.criticality IS 'Nível de criticidade do indicador: high, medium, low';
COMMENT ON COLUMN public.indicators.integration_available IS 'Se o indicador tem integração automática disponível';
COMMENT ON COLUMN public.indicators.calculation_cost IS 'Custo de cálculo: high, medium, low';
COMMENT ON COLUMN public.assessments.tier IS 'Nível de diagnóstico: COMPLETE (todos indicadores), MEDIUM (núcleo + críticos), SMALL (mínimo viável)';