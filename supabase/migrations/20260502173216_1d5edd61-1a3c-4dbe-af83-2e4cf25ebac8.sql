CREATE TABLE IF NOT EXISTS public.report_generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  job_id UUID,
  report_id UUID,
  assessment_id UUID,
  org_id UUID,
  user_id UUID,
  trace_id TEXT,
  provider TEXT,
  model TEXT,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','error')),
  stage TEXT,
  message TEXT,
  duration_ms INTEGER,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_rgl_created_at ON public.report_generation_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rgl_provider ON public.report_generation_logs (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rgl_level ON public.report_generation_logs (level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rgl_job ON public.report_generation_logs (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rgl_trace ON public.report_generation_logs (trace_id);

ALTER TABLE public.report_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view report generation logs"
  ON public.report_generation_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));