
-- Table to store health check results
CREATE TABLE public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id),
  run_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_checks INTEGER DEFAULT 0,
  passed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  warnings INTEGER DEFAULT 0,
  results JSONB DEFAULT '[]'::jsonb,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to store client-side error reports
CREATE TABLE public.client_error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  org_id UUID REFERENCES public.orgs(id),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_error_reports ENABLE ROW LEVEL SECURITY;

-- Only SISTUR admins can view health checks
CREATE POLICY "Admins can view health checks"
  ON public.system_health_checks FOR SELECT
  TO authenticated
  USING (public.is_sistur_admin(auth.uid()));

CREATE POLICY "Admins can insert health checks"
  ON public.system_health_checks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_sistur_admin(auth.uid()));

CREATE POLICY "Admins can update health checks"
  ON public.system_health_checks FOR UPDATE
  TO authenticated
  USING (public.is_sistur_admin(auth.uid()));

-- Anyone authenticated can report errors
CREATE POLICY "Users can insert error reports"
  ON public.client_error_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only admins can view error reports
CREATE POLICY "Admins can view error reports"
  ON public.client_error_reports FOR SELECT
  TO authenticated
  USING (public.is_sistur_admin(auth.uid()));

-- Service role can insert health checks (for edge function)
CREATE POLICY "Service can insert health checks"
  ON public.system_health_checks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service can update health checks"
  ON public.system_health_checks FOR UPDATE
  TO anon
  USING (true);
