-- Add data source metadata fields to indicators table
-- Per SISTUR Add-on: source, collection type, reliability must be explicit

-- Create enum for collection type
CREATE TYPE public.collection_type AS ENUM ('AUTOMATICA', 'MANUAL', 'ESTIMADA');

-- Create enum for data source
CREATE TYPE public.data_source AS ENUM ('IBGE', 'CADASTUR', 'PESQUISA_LOCAL', 'MANUAL', 'OUTRO');

-- Add new columns to indicators table
ALTER TABLE public.indicators 
ADD COLUMN data_source public.data_source DEFAULT 'MANUAL',
ADD COLUMN collection_type public.collection_type DEFAULT 'MANUAL',
ADD COLUMN reference_date date,
ADD COLUMN reliability_score double precision GENERATED ALWAYS AS (
  CASE 
    WHEN collection_type = 'AUTOMATICA' THEN 1.0
    WHEN collection_type = 'MANUAL' THEN 0.7
    WHEN collection_type = 'ESTIMADA' THEN 0.4
    ELSE 0.5
  END
) STORED;

-- Add reference_date to indicator_values for when data was collected
ALTER TABLE public.indicator_values
ADD COLUMN reference_date date;