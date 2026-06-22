
-- 1) Table
CREATE TABLE public.enterprise_pms_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  destination_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('cloudbeds','stays','opera','hits')),
  property_id text,
  property_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','error','disconnected')),
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  last_import_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_id, provider)
);

-- 2) Column-level grants: hide credentials from `authenticated`
GRANT SELECT (id, org_id, destination_id, provider, property_id, property_name, status, last_sync_at, last_sync_status, last_sync_error, last_import_id, created_by, created_at, updated_at)
  ON public.enterprise_pms_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.enterprise_pms_connections TO authenticated;
GRANT ALL ON public.enterprise_pms_connections TO service_role;

-- 3) RLS
ALTER TABLE public.enterprise_pms_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view PMS connections"
  ON public.enterprise_pms_connections FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Org admins can insert PMS connections"
  ON public.enterprise_pms_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
      AND (public.has_role(auth.uid(), 'ORG_ADMIN'::app_role) OR public.has_role(auth.uid(), 'ANALYST'::app_role)))
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Org admins can update PMS connections"
  ON public.enterprise_pms_connections FOR UPDATE
  TO authenticated
  USING (
    (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
      AND (public.has_role(auth.uid(), 'ORG_ADMIN'::app_role) OR public.has_role(auth.uid(), 'ANALYST'::app_role)))
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Org admins can delete PMS connections"
  ON public.enterprise_pms_connections FOR DELETE
  TO authenticated
  USING (
    (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
      AND (public.has_role(auth.uid(), 'ORG_ADMIN'::app_role) OR public.has_role(auth.uid(), 'ANALYST'::app_role)))
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- 4) updated_at trigger
CREATE TRIGGER trg_enterprise_pms_connections_updated_at
  BEFORE UPDATE ON public.enterprise_pms_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Index for cron sync sweeps
CREATE INDEX idx_enterprise_pms_connections_active
  ON public.enterprise_pms_connections (status, last_sync_at) WHERE status = 'active';
