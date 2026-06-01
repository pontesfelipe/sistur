CREATE TABLE IF NOT EXISTS public.org_module_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_org_module_overrides_org ON public.org_module_overrides(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_module_overrides TO authenticated;
GRANT ALL ON public.org_module_overrides TO service_role;

ALTER TABLE public.org_module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their module overrides"
  ON public.org_module_overrides FOR SELECT
  USING (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR org_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Only admins can manage module overrides"
  ON public.org_module_overrides FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TRIGGER trg_org_module_overrides_updated_at
  BEFORE UPDATE ON public.org_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.org_has_module(_org_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.org_module_overrides
       WHERE org_id = _org_id AND module_key = _module LIMIT 1),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION public.org_has_module(UUID, TEXT) TO authenticated, anon, service_role;