-- 1. Métricas onde queda é boa
UPDATE public.observatory_metrics SET higher_is_better = false WHERE code = 'empregos_desligados';

-- 2. Novas métricas de declínio desejado
INSERT INTO public.observatory_metrics (code, category, name, description, unit, aggregation, display_order, higher_is_better) VALUES
('sazonalidade_indice', 'fluxo', 'Índice de Sazonalidade (Gini)', 'Concentração da demanda em poucos meses (0 = uniforme, 1 = totalmente concentrado)', 'índice', 'avg', 10, false),
('reclamacoes_turistas', 'receita', 'Reclamações de Turistas', 'Total de reclamações formais registradas no período', 'reclamações', 'sum', 10, false),
('cancelamentos_reservas', 'ocupacao', 'Cancelamentos de Reservas', 'Reservas canceladas no período', 'reservas', 'sum', 10, false),
('incidentes_seguranca_turistica', 'fluxo', 'Incidentes de Segurança ao Turista', 'Ocorrências envolvendo turistas registradas pelos órgãos de segurança', 'ocorrências', 'sum', 11, false)
ON CONFLICT (code) DO UPDATE SET
  higher_is_better = EXCLUDED.higher_is_better,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;

-- 3. Rastreio de e-mails enviados para alertas críticos (idempotência)
ALTER TABLE public.observatory_alerts
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_recipients_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_obs_alerts_critical_pending_email
  ON public.observatory_alerts (org_id, created_at DESC)
  WHERE severity = 'critical' AND email_sent_at IS NULL AND is_dismissed = false;