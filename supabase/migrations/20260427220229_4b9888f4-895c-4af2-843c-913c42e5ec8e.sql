-- Fase 5 — Etapa 3: Receita turística determinística
CREATE TABLE IF NOT EXISTS public.tourism_spending_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'GERAL',
  origin TEXT NOT NULL CHECK (origin IN ('NACIONAL','INTERNACIONAL')),
  avg_daily_spending_brl NUMERIC NOT NULL CHECK (avg_daily_spending_brl >= 0),
  avg_stay_days NUMERIC NOT NULL DEFAULT 4 CHECK (avg_stay_days > 0),
  reference_year INT NOT NULL,
  source TEXT NOT NULL DEFAULT 'MTur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (uf, segment, origin, reference_year)
);

ALTER TABLE public.tourism_spending_reference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tsr_read_all" ON public.tourism_spending_reference;
CREATE POLICY "tsr_read_all" ON public.tourism_spending_reference
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tsr_admin_write" ON public.tourism_spending_reference;
CREATE POLICY "tsr_admin_write" ON public.tourism_spending_reference
  FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));

INSERT INTO public.tourism_spending_reference (uf, segment, origin, avg_daily_spending_brl, avg_stay_days, reference_year, source) VALUES
  ('BR','GERAL','NACIONAL', 320, 4.2, 2023, 'MTur Pesquisa de Turismo Doméstico'),
  ('BR','GERAL','INTERNACIONAL', 540, 11.5, 2023, 'MTur Anuário Estatístico')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.compute_tourism_revenue_per_capita(p_ibge_code TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pop NUMERIC; v_vn NUMERIC; v_vi NUMERIC;
  v_gasto_n NUMERIC; v_gasto_i NUMERIC;
  v_stay_n NUMERIC; v_stay_i NUMERIC;
  v_uf TEXT;
  v_revenue NUMERIC;
BEGIN
  SELECT raw_value INTO v_pop FROM external_indicator_values
   WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_populacao' AND validated = true
   ORDER BY reference_year DESC LIMIT 1;
  IF v_pop IS NULL OR v_pop <= 0 THEN RETURN NULL; END IF;

  SELECT raw_value INTO v_vn FROM external_indicator_values
   WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_visitantes_nacionais' AND validated = true
   ORDER BY reference_year DESC LIMIT 1;
  SELECT raw_value INTO v_vi FROM external_indicator_values
   WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_visitantes_internacionais' AND validated = true
   ORDER BY reference_year DESC LIMIT 1;

  IF COALESCE(v_vn,0) + COALESCE(v_vi,0) = 0 THEN RETURN NULL; END IF;

  SELECT CASE substring(p_ibge_code,1,2)
    WHEN '11' THEN 'RO' WHEN '12' THEN 'AC' WHEN '13' THEN 'AM' WHEN '14' THEN 'RR'
    WHEN '15' THEN 'PA' WHEN '16' THEN 'AP' WHEN '17' THEN 'TO' WHEN '21' THEN 'MA'
    WHEN '22' THEN 'PI' WHEN '23' THEN 'CE' WHEN '24' THEN 'RN' WHEN '25' THEN 'PB'
    WHEN '26' THEN 'PE' WHEN '27' THEN 'AL' WHEN '28' THEN 'SE' WHEN '29' THEN 'BA'
    WHEN '31' THEN 'MG' WHEN '32' THEN 'ES' WHEN '33' THEN 'RJ' WHEN '35' THEN 'SP'
    WHEN '41' THEN 'PR' WHEN '42' THEN 'SC' WHEN '43' THEN 'RS' WHEN '50' THEN 'MS'
    WHEN '51' THEN 'MT' WHEN '52' THEN 'GO' WHEN '53' THEN 'DF'
    ELSE 'BR' END INTO v_uf;

  SELECT avg_daily_spending_brl, avg_stay_days INTO v_gasto_n, v_stay_n
   FROM tourism_spending_reference
   WHERE origin = 'NACIONAL' AND uf IN (v_uf, 'BR')
   ORDER BY (uf = v_uf) DESC, reference_year DESC LIMIT 1;
  SELECT avg_daily_spending_brl, avg_stay_days INTO v_gasto_i, v_stay_i
   FROM tourism_spending_reference
   WHERE origin = 'INTERNACIONAL' AND uf IN (v_uf, 'BR')
   ORDER BY (uf = v_uf) DESC, reference_year DESC LIMIT 1;

  v_revenue := (COALESCE(v_vn,0) * COALESCE(v_gasto_n,320) * COALESCE(v_stay_n,4.2))
             + (COALESCE(v_vi,0) * COALESCE(v_gasto_i,540) * COALESCE(v_stay_i,11.5));

  RETURN ROUND(v_revenue / v_pop, 2);
END;
$$;