
-- Dynamic test flow registry
CREATE TABLE public.test_flow_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL,
  test_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_discovered BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, test_name)
);

-- Sync log to track when registry was updated
CREATE TABLE public.test_registry_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version TEXT,
  total_tests INTEGER DEFAULT 0,
  tests_added INTEGER DEFAULT 0,
  tests_removed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  details JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_flow_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_registry_sync_log ENABLE ROW LEVEL SECURITY;

-- Admin read/write on registry
CREATE POLICY "Admins manage test registry"
  ON public.test_flow_registry FOR ALL
  TO authenticated
  USING (public.is_sistur_admin(auth.uid()));

CREATE POLICY "Admins view sync log"
  ON public.test_registry_sync_log FOR SELECT
  TO authenticated
  USING (public.is_sistur_admin(auth.uid()));

-- Service role access for edge functions
CREATE POLICY "Service insert test registry"
  ON public.test_flow_registry FOR ALL
  TO anon
  USING (true);

CREATE POLICY "Service insert sync log"
  ON public.test_registry_sync_log FOR INSERT
  TO anon
  WITH CHECK (true);
