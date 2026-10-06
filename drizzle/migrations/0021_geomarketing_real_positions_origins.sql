ALTER TABLE public.enterprise_competitors ADD COLUMN IF NOT EXISTS latitude double precision, ADD COLUMN IF NOT EXISTS longitude double precision, ADD COLUMN IF NOT EXISTS position_source text, ADD COLUMN IF NOT EXISTS avg_daily_rate numeric;

CREATE TABLE IF NOT EXISTS public.destination_visitor_origins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  uf text NOT NULL,
  share_pct numeric NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, destination_id, uf)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destination_visitor_origins TO authenticated;
GRANT ALL ON public.destination_visitor_origins TO service_role;
ALTER TABLE public.destination_visitor_origins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dvo_select_org" ON public.destination_visitor_origins FOR SELECT TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));
CREATE POLICY "dvo_modify_org" ON public.destination_visitor_origins FOR ALL TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'))
  WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));
CREATE TRIGGER update_dvo_updated_at BEFORE UPDATE ON public.destination_visitor_origins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();