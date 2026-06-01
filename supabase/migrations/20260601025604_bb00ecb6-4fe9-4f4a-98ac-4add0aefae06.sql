
-- =========================================================
-- ERP REGIONAL / CONSÓRCIOS — MVP
-- =========================================================

-- 1) Tabela principal: consortia
CREATE TABLE public.consortia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  lead_org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consortia_lead_org ON public.consortia(lead_org_id);
CREATE INDEX idx_consortia_status ON public.consortia(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consortia TO authenticated;
GRANT ALL ON public.consortia TO service_role;

-- 2) Membros (orgs) de cada consórcio
CREATE TABLE public.consortium_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id uuid NOT NULL REFERENCES public.consortia(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'member' CHECK (member_role IN ('lead','member')),
  invited_by uuid NOT NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid,
  declined_at timestamptz,
  declined_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consortium_id, org_id)
);
CREATE INDEX idx_consortium_members_org ON public.consortium_members(org_id);
CREATE INDEX idx_consortium_members_consortium ON public.consortium_members(consortium_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consortium_members TO authenticated;
GRANT ALL ON public.consortium_members TO service_role;

-- 3) Papéis de usuário dentro de um consórcio
CREATE TABLE public.consortium_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id uuid NOT NULL REFERENCES public.consortia(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('consortium_admin','consortium_viewer')),
  granted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consortium_id, user_id, role)
);
CREATE INDEX idx_consortium_user_roles_user ON public.consortium_user_roles(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consortium_user_roles TO authenticated;
GRANT ALL ON public.consortium_user_roles TO service_role;

-- 4) Trigger updated_at
CREATE TRIGGER trg_consortia_updated_at
BEFORE UPDATE ON public.consortia
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_consortium_members_updated_at
BEFORE UPDATE ON public.consortium_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Security-definer helpers (evitam recursão de RLS)

-- Retorna true se o usuário pertence a alguma org já aceita do consórcio,
-- OU tem papel de consortium_user_role, OU é ADMIN global, OU é ORG_ADMIN do município-líder.
CREATE OR REPLACE FUNCTION public.can_view_consortium(_consortium_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'ADMIN'
  )
  OR EXISTS (
    SELECT 1
    FROM public.consortium_members cm
    JOIN public.profiles p ON p.org_id = cm.org_id
    WHERE cm.consortium_id = _consortium_id
      AND cm.accepted_at IS NOT NULL
      AND p.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.consortium_user_roles cur
    WHERE cur.consortium_id = _consortium_id AND cur.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.consortia c
    JOIN public.profiles p ON p.org_id = c.lead_org_id
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'ORG_ADMIN'
    WHERE c.id = _consortium_id AND p.user_id = _user_id
  );
$$;

-- Retorna true se pode administrar o consórcio (gerenciar membros e permissões).
CREATE OR REPLACE FUNCTION public.is_consortium_admin(_consortium_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'ADMIN'
  )
  OR EXISTS (
    SELECT 1 FROM public.consortia c
    WHERE c.id = _consortium_id AND c.created_by = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.consortia c
    JOIN public.profiles p ON p.org_id = c.lead_org_id
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'ORG_ADMIN'
    WHERE c.id = _consortium_id AND p.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.consortium_user_roles cur
    WHERE cur.consortium_id = _consortium_id
      AND cur.user_id = _user_id
      AND cur.role = 'consortium_admin'
  );
$$;

-- Retorna true se o usuário é ORG_ADMIN da org indicada (para aceitar/recusar convites).
CREATE OR REPLACE FUNCTION public.is_org_admin_of(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.user_id = _user_id
      AND p.org_id = _org_id
      AND ur.role IN ('ORG_ADMIN','ADMIN')
  );
$$;

-- 6) Comparativo de pilares para os membros aceitos
CREATE OR REPLACE FUNCTION public.get_consortium_comparison(_consortium_id uuid)
RETURNS TABLE (
  org_id uuid,
  org_name text,
  destination_name text,
  ra_score numeric,
  oe_score numeric,
  ao_score numeric,
  ra_status text,
  oe_status text,
  ao_status text,
  final_score numeric,
  final_classification text,
  last_calculated_at timestamptz,
  latitude double precision,
  longitude double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH allowed AS (
    SELECT 1 WHERE public.can_view_consortium(_consortium_id, auth.uid())
  ),
  members AS (
    SELECT cm.org_id
    FROM public.consortium_members cm
    WHERE cm.consortium_id = _consortium_id
      AND cm.accepted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM allowed)
  ),
  latest AS (
    SELECT DISTINCT ON (a.org_id)
      a.org_id,
      a.id AS assessment_id,
      a.destination_id,
      a.final_score,
      a.final_classification,
      a.calculated_at
    FROM public.assessments a
    WHERE a.org_id IN (SELECT org_id FROM members)
      AND a.calculated_at IS NOT NULL
    ORDER BY a.org_id, a.calculated_at DESC
  )
  SELECT
    o.id AS org_id,
    o.name AS org_name,
    d.name AS destination_name,
    ps_ra.score AS ra_score,
    ps_oe.score AS oe_score,
    ps_ao.score AS ao_score,
    CASE WHEN ps_ra.score IS NULL THEN NULL
         WHEN ps_ra.score >= 67 THEN 'ADEQUADO'
         WHEN ps_ra.score >= 34 THEN 'ATENCAO'
         ELSE 'CRITICO' END AS ra_status,
    CASE WHEN ps_oe.score IS NULL THEN NULL
         WHEN ps_oe.score >= 67 THEN 'ADEQUADO'
         WHEN ps_oe.score >= 34 THEN 'ATENCAO'
         ELSE 'CRITICO' END AS oe_status,
    CASE WHEN ps_ao.score IS NULL THEN NULL
         WHEN ps_ao.score >= 67 THEN 'ADEQUADO'
         WHEN ps_ao.score >= 34 THEN 'ATENCAO'
         ELSE 'CRITICO' END AS ao_status,
    l.final_score,
    l.final_classification,
    l.calculated_at,
    d.latitude,
    d.longitude
  FROM members m
  JOIN public.orgs o ON o.id = m.org_id
  LEFT JOIN latest l ON l.org_id = m.org_id
  LEFT JOIN public.destinations d ON d.id = l.destination_id
  LEFT JOIN public.pillar_scores ps_ra ON ps_ra.assessment_id = l.assessment_id AND ps_ra.pillar = 'RA'
  LEFT JOIN public.pillar_scores ps_oe ON ps_oe.assessment_id = l.assessment_id AND ps_oe.pillar = 'OE'
  LEFT JOIN public.pillar_scores ps_ao ON ps_ao.assessment_id = l.assessment_id AND ps_ao.pillar = 'AO';
$$;

GRANT EXECUTE ON FUNCTION public.can_view_consortium(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_consortium_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consortium_comparison(uuid) TO authenticated;

-- 7) Habilita RLS e cria políticas

ALTER TABLE public.consortia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view consortia user can see"
ON public.consortia FOR SELECT TO authenticated
USING (public.can_view_consortium(id, auth.uid()));

CREATE POLICY "create consortium by org_admin/admin"
ON public.consortia FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'ADMIN')
    OR public.is_org_admin_of(lead_org_id, auth.uid())
  )
);

CREATE POLICY "update consortium by admin"
ON public.consortia FOR UPDATE TO authenticated
USING (public.is_consortium_admin(id, auth.uid()))
WITH CHECK (public.is_consortium_admin(id, auth.uid()));

CREATE POLICY "delete consortium by admin"
ON public.consortia FOR DELETE TO authenticated
USING (public.is_consortium_admin(id, auth.uid()));

ALTER TABLE public.consortium_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view members visible to consortium viewers"
ON public.consortium_members FOR SELECT TO authenticated
USING (
  public.can_view_consortium(consortium_id, auth.uid())
  OR public.is_org_admin_of(org_id, auth.uid())
);

CREATE POLICY "insert member by consortium admin"
ON public.consortium_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_consortium_admin(consortium_id, auth.uid())
  AND invited_by = auth.uid()
);

-- Update: admin do consórcio pode tudo; ORG_ADMIN da org pode aceitar/recusar (próprias colunas).
CREATE POLICY "update member by admin or accepting org_admin"
ON public.consortium_members FOR UPDATE TO authenticated
USING (
  public.is_consortium_admin(consortium_id, auth.uid())
  OR public.is_org_admin_of(org_id, auth.uid())
)
WITH CHECK (
  public.is_consortium_admin(consortium_id, auth.uid())
  OR public.is_org_admin_of(org_id, auth.uid())
);

CREATE POLICY "delete member by consortium admin"
ON public.consortium_members FOR DELETE TO authenticated
USING (public.is_consortium_admin(consortium_id, auth.uid()));

ALTER TABLE public.consortium_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view consortium_user_roles by viewers"
ON public.consortium_user_roles FOR SELECT TO authenticated
USING (
  public.can_view_consortium(consortium_id, auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "manage consortium_user_roles by admin"
ON public.consortium_user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_consortium_admin(consortium_id, auth.uid()) AND granted_by = auth.uid());

CREATE POLICY "delete consortium_user_roles by admin"
ON public.consortium_user_roles FOR DELETE TO authenticated
USING (public.is_consortium_admin(consortium_id, auth.uid()));
