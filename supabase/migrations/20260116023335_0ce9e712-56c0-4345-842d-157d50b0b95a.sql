-- Fix: relevance_score column needs to support values up to 100
-- Current NUMERIC(4,2) only allows values from -99.99 to 99.99
-- Change to NUMERIC(5,2) to allow 100.00
ALTER TABLE public.edu_personalized_recommendations
ALTER COLUMN relevance_score TYPE NUMERIC(5,2);