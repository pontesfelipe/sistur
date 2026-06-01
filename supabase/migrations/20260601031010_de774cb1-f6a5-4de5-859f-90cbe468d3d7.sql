-- ============================================
-- OBSERVATÓRIO TURÍSTICO PERMANENTE
-- ============================================

-- 1. Catálogo público de métricas
CREATE TABLE public.observatory_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  aggregation TEXT NOT NULL DEFAULT 'sum',
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.observatory_metrics TO anon, authenticated;
GRANT ALL ON public.observatory_metrics TO service_role;

ALTER TABLE public.observatory_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obs_metrics_public_read"
ON public.observatory_metrics FOR SELECT USING (true);

CREATE POLICY "obs_metrics_admin_manage"
ON public.observatory_metrics FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Helper: verificar se usuário pertence à org via profiles
CREATE OR REPLACE FUNCTION public.user_in_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND org_id = _org_id
  );
$$;

-- 2. Medições periódicas
CREATE TABLE public.observatory_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  metric_id UUID NOT NULL REFERENCES public.observatory_metrics(id) ON DELETE CASCADE,
  reference_year INTEGER NOT NULL,
  reference_month INTEGER,
  value NUMERIC NOT NULL,
  source TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, metric_id, reference_year, reference_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.observatory_measurements TO authenticated;
GRANT ALL ON public.observatory_measurements TO service_role;

ALTER TABLE public.observatory_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obs_meas_select"
ON public.observatory_measurements FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN')
  OR org_id = public.get_effective_org_id()
  OR public.user_in_org(auth.uid(), org_id)
);

CREATE POLICY "obs_meas_insert"
ON public.observatory_measurements FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'ADMIN')
  OR public.user_in_org(auth.uid(), org_id)
);

CREATE POLICY "obs_meas_update"
ON public.observatory_measurements FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN')
  OR public.user_in_org(auth.uid(), org_id)
);

CREATE POLICY "obs_meas_delete"
ON public.observatory_measurements FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN')
  OR public.user_in_org(auth.uid(), org_id)
);

CREATE TRIGGER update_observatory_measurements_updated_at
BEFORE UPDATE ON public.observatory_measurements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Calendário de eventos
CREATE TABLE public.observatory_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  estimated_attendance INTEGER,
  estimated_revenue NUMERIC,
  actual_attendance INTEGER,
  actual_revenue NUMERIC,
  status TEXT NOT NULL DEFAULT 'planned',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.observatory_events TO authenticated;
GRANT ALL ON public.observatory_events TO service_role;

ALTER TABLE public.observatory_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obs_events_select"
ON public.observatory_events FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN')
  OR org_id = public.get_effective_org_id()
  OR public.user_in_org(auth.uid(), org_id)
);

CREATE POLICY "obs_events_manage"
ON public.observatory_events FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN')
  OR public.user_in_org(auth.uid(), org_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'ADMIN')
  OR public.user_in_org(auth.uid(), org_id)
);

CREATE TRIGGER update_observatory_events_updated_at
BEFORE UPDATE ON public.observatory_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_obs_meas_org_year ON public.observatory_measurements(org_id, reference_year, reference_month);
CREATE INDEX idx_obs_events_org_date ON public.observatory_events(org_id, start_date);

-- 4. Seed do catálogo
INSERT INTO public.observatory_metrics (code, category, name, description, unit, aggregation, display_order) VALUES
('fluxo_visitantes_total', 'fluxo', 'Visitantes Totais', 'Número total de visitantes', 'visitantes', 'sum', 1),
('fluxo_visitantes_nacionais', 'fluxo', 'Visitantes Nacionais', 'Visitantes domésticos', 'visitantes', 'sum', 2),
('fluxo_visitantes_internacionais', 'fluxo', 'Visitantes Internacionais', 'Turistas estrangeiros', 'visitantes', 'sum', 3),
('fluxo_permanencia_media', 'fluxo', 'Permanência Média', 'Dias de permanência média', 'dias', 'avg', 4),
('ocupacao_hoteleira', 'ocupacao', 'Taxa de Ocupação Hoteleira', 'Percentual médio de ocupação', '%', 'avg', 1),
('ocupacao_diaria_media', 'ocupacao', 'Diária Média', 'Valor médio da diária', 'BRL', 'avg', 2),
('ocupacao_leitos_disponiveis', 'ocupacao', 'Leitos Disponíveis', 'Total de leitos no destino', 'leitos', 'last', 3),
('eventos_realizados', 'eventos', 'Eventos Realizados', 'Total de eventos no período', 'eventos', 'sum', 1),
('eventos_participantes', 'eventos', 'Participantes em Eventos', 'Público total dos eventos', 'pessoas', 'sum', 2),
('receita_turistica_total', 'receita', 'Receita Turística Total', 'Receita gerada pelo turismo', 'BRL', 'sum', 1),
('receita_arrecadacao_iss', 'receita', 'Arrecadação ISS Turismo', 'ISS de atividades turísticas', 'BRL', 'sum', 2),
('receita_gasto_medio', 'receita', 'Gasto Médio por Visitante', 'Gasto médio per capita', 'BRL', 'avg', 3),
('empregos_formais', 'empregos', 'Empregos Formais no Turismo', 'CAGED - vínculos ativos', 'pessoas', 'last', 1),
('empregos_admitidos', 'empregos', 'Admissões no Turismo', 'Novos contratos no período', 'pessoas', 'sum', 2),
('empregos_desligados', 'empregos', 'Desligamentos no Turismo', 'Desligamentos no período', 'pessoas', 'sum', 3);

-- 5. RPC sumário
CREATE OR REPLACE FUNCTION public.get_observatory_summary(_org_id UUID, _year INTEGER)
RETURNS TABLE (
  category TEXT, metric_code TEXT, metric_name TEXT, unit TEXT,
  total_value NUMERIC, avg_value NUMERIC, data_points INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.category, m.code, m.name, m.unit,
    COALESCE(SUM(ms.value), 0)::NUMERIC AS total_value,
    COALESCE(AVG(ms.value), 0)::NUMERIC AS avg_value,
    COUNT(ms.id)::INTEGER AS data_points
  FROM public.observatory_metrics m
  LEFT JOIN public.observatory_measurements ms
    ON ms.metric_id = m.id AND ms.org_id = _org_id AND ms.reference_year = _year
  WHERE m.active = true
  GROUP BY m.category, m.code, m.name, m.unit, m.display_order
  ORDER BY m.category, m.display_order;
$$;