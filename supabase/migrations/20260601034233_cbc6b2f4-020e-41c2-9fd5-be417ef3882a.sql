
-- Direção da métrica (maior é melhor por padrão para indicadores turísticos)
ALTER TABLE public.observatory_metrics
  ADD COLUMN IF NOT EXISTS higher_is_better boolean NOT NULL DEFAULT true;

-- Tabela de alertas do Observatório
CREATE TABLE IF NOT EXISTS public.observatory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  metric_id uuid NOT NULL REFERENCES public.observatory_metrics(id) ON DELETE CASCADE,
  reference_year integer NOT NULL,
  reference_month integer,
  previous_year integer NOT NULL,
  previous_month integer,
  previous_value numeric NOT NULL,
  current_value numeric NOT NULL,
  delta_pct numeric NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, metric_id, reference_year, reference_month)
);

GRANT SELECT, UPDATE, DELETE ON public.observatory_alerts TO authenticated;
GRANT ALL ON public.observatory_alerts TO service_role;

ALTER TABLE public.observatory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obs_alerts_select" ON public.observatory_alerts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role) OR org_id = get_effective_org_id() OR user_in_org(auth.uid(), org_id));

CREATE POLICY "obs_alerts_update" ON public.observatory_alerts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role) OR user_in_org(auth.uid(), org_id))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR user_in_org(auth.uid(), org_id));

CREATE POLICY "obs_alerts_delete" ON public.observatory_alerts
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role) OR user_in_org(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_obs_alerts_org_open
  ON public.observatory_alerts (org_id, is_dismissed, created_at DESC);

-- Função que detecta regressão comparando com período anterior (mês anterior ou ano anterior)
CREATE OR REPLACE FUNCTION public.detect_observatory_regression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_value numeric;
  prev_year integer;
  prev_month integer;
  delta numeric;
  metric_rec record;
  threshold numeric := 10.0;
  is_regression boolean;
  msg text;
BEGIN
  SELECT * INTO metric_rec FROM public.observatory_metrics WHERE id = NEW.metric_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Identificar período anterior: mês anterior (mensal) ou ano anterior (anual)
  IF NEW.reference_month IS NOT NULL THEN
    IF NEW.reference_month = 1 THEN
      prev_year := NEW.reference_year - 1;
      prev_month := 12;
    ELSE
      prev_year := NEW.reference_year;
      prev_month := NEW.reference_month - 1;
    END IF;

    SELECT value INTO prev_value
    FROM public.observatory_measurements
    WHERE org_id = NEW.org_id
      AND metric_id = NEW.metric_id
      AND reference_year = prev_year
      AND reference_month = prev_month;
  ELSE
    prev_year := NEW.reference_year - 1;
    prev_month := NULL;

    SELECT value INTO prev_value
    FROM public.observatory_measurements
    WHERE org_id = NEW.org_id
      AND metric_id = NEW.metric_id
      AND reference_year = prev_year
      AND reference_month IS NULL;
  END IF;

  IF prev_value IS NULL OR prev_value = 0 THEN RETURN NEW; END IF;

  delta := ((NEW.value - prev_value) / abs(prev_value)) * 100.0;

  -- Regressão: queda quando higher_is_better, alta quando lower_is_better
  IF metric_rec.higher_is_better THEN
    is_regression := delta <= -threshold;
  ELSE
    is_regression := delta >= threshold;
  END IF;

  IF NOT is_regression THEN
    -- Limpa alerta anterior se valor voltou ao normal
    DELETE FROM public.observatory_alerts
     WHERE org_id = NEW.org_id AND metric_id = NEW.metric_id
       AND reference_year = NEW.reference_year
       AND reference_month IS NOT DISTINCT FROM NEW.reference_month;
    RETURN NEW;
  END IF;

  msg := format('%s registrou variação de %s%% em relação ao período anterior (%s → %s).',
                metric_rec.name,
                to_char(delta, 'FM999990.0'),
                to_char(prev_value, 'FM999G999G990D00'),
                to_char(NEW.value, 'FM999G999G990D00'));

  INSERT INTO public.observatory_alerts (
    org_id, metric_id, reference_year, reference_month,
    previous_year, previous_month, previous_value, current_value,
    delta_pct, severity, message
  ) VALUES (
    NEW.org_id, NEW.metric_id, NEW.reference_year, NEW.reference_month,
    prev_year, prev_month, prev_value, NEW.value,
    delta,
    CASE WHEN abs(delta) >= 25 THEN 'critical' ELSE 'warning' END,
    msg
  )
  ON CONFLICT (org_id, metric_id, reference_year, reference_month)
  DO UPDATE SET
    previous_value = EXCLUDED.previous_value,
    current_value = EXCLUDED.current_value,
    delta_pct = EXCLUDED.delta_pct,
    severity = EXCLUDED.severity,
    message = EXCLUDED.message,
    is_read = false,
    is_dismissed = false,
    created_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_observatory_regression ON public.observatory_measurements;
CREATE TRIGGER trg_observatory_regression
AFTER INSERT OR UPDATE OF value ON public.observatory_measurements
FOR EACH ROW EXECUTE FUNCTION public.detect_observatory_regression();
