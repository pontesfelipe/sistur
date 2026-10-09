ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS territory_scale text NOT NULL DEFAULT 'municipal' CHECK (territory_scale IN ('municipal','state'));
ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS territory_scale text NOT NULL DEFAULT 'municipal' CHECK (territory_scale IN ('municipal','state','both'));
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'regional' CHECK (scope IN ('regional','state'));
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS uf text;

-- Panorama estadual: agrega os municípios (escala municipal) da UF que aceitaram
-- participar de qualquer consórcio visível ao usuário. Sem consentimento, não entra.
CREATE OR REPLACE FUNCTION public.get_state_panorama(_uf text)
RETURNS TABLE(org_id uuid, org_name text, destination_name text, tourism_region text,
  ra_score numeric, oe_score numeric, ao_score numeric, final_score numeric, last_calculated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH visible AS (
    SELECT c.id FROM public.consortia c WHERE public.can_view_consortium(c.id, auth.uid())
  ),
  members AS (
    SELECT DISTINCT cm.org_id FROM public.consortium_members cm
    WHERE cm.consortium_id IN (SELECT id FROM visible) AND cm.accepted_at IS NOT NULL
  ),
  latest AS (
    SELECT DISTINCT ON (a.org_id) a.org_id, a.id AS assessment_id, a.destination_id, a.final_score, a.calculated_at
    FROM public.assessments a
    JOIN public.destinations d ON d.id = a.destination_id
    WHERE a.org_id IN (SELECT org_id FROM members)
      AND a.calculated_at IS NOT NULL
      AND upper(d.uf) = upper(_uf)
      AND d.territory_scale = 'municipal'
    ORDER BY a.org_id, a.calculated_at DESC
  )
  SELECT o.id, o.name, d.name, d.tourism_region,
    ps_ra.score, ps_oe.score, ps_ao.score, l.final_score, l.calculated_at
  FROM latest l
  JOIN public.orgs o ON o.id = l.org_id
  JOIN public.destinations d ON d.id = l.destination_id
  LEFT JOIN public.pillar_scores ps_ra ON ps_ra.assessment_id = l.assessment_id AND ps_ra.pillar = 'RA'
  LEFT JOIN public.pillar_scores ps_oe ON ps_oe.assessment_id = l.assessment_id AND ps_oe.pillar = 'OE'
  LEFT JOIN public.pillar_scores ps_ao ON ps_ao.assessment_id = l.assessment_id AND ps_ao.pillar = 'AO';
$$;
REVOKE ALL ON FUNCTION public.get_state_panorama(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_state_panorama(text) TO authenticated;