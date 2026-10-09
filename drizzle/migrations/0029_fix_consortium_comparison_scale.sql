CREATE OR REPLACE FUNCTION public.get_consortium_comparison(_consortium_id uuid)
 RETURNS TABLE(org_id uuid, org_name text, destination_name text, ra_score numeric, oe_score numeric, ao_score numeric, ra_status text, oe_status text, ao_status text, final_score numeric, final_classification text, last_calculated_at timestamp with time zone, latitude double precision, longitude double precision)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH allowed AS (SELECT 1 WHERE public.can_view_consortium(_consortium_id, auth.uid())),
  members AS (
    SELECT cm.org_id FROM public.consortium_members cm
    WHERE cm.consortium_id = _consortium_id AND cm.accepted_at IS NOT NULL AND EXISTS (SELECT 1 FROM allowed)
  ),
  latest AS (
    SELECT DISTINCT ON (a.org_id) a.org_id, a.id AS assessment_id, a.destination_id, a.final_score, a.final_classification, a.calculated_at
    FROM public.assessments a
    WHERE a.org_id IN (SELECT org_id FROM members) AND a.calculated_at IS NOT NULL
    ORDER BY a.org_id, a.calculated_at DESC
  )
  SELECT o.id, o.name, d.name, ps_ra.score, ps_oe.score, ps_ao.score,
    CASE WHEN ps_ra.score IS NULL THEN NULL WHEN round(ps_ra.score*100) >= 67 THEN 'ADEQUADO' WHEN round(ps_ra.score*100) >= 34 THEN 'ATENCAO' ELSE 'CRITICO' END,
    CASE WHEN ps_oe.score IS NULL THEN NULL WHEN round(ps_oe.score*100) >= 67 THEN 'ADEQUADO' WHEN round(ps_oe.score*100) >= 34 THEN 'ATENCAO' ELSE 'CRITICO' END,
    CASE WHEN ps_ao.score IS NULL THEN NULL WHEN round(ps_ao.score*100) >= 67 THEN 'ADEQUADO' WHEN round(ps_ao.score*100) >= 34 THEN 'ATENCAO' ELSE 'CRITICO' END,
    l.final_score, l.final_classification, l.calculated_at, d.latitude, d.longitude
  FROM members m
  JOIN public.orgs o ON o.id = m.org_id
  LEFT JOIN latest l ON l.org_id = m.org_id
  LEFT JOIN public.destinations d ON d.id = l.destination_id
  LEFT JOIN public.pillar_scores ps_ra ON ps_ra.assessment_id = l.assessment_id AND ps_ra.pillar = 'RA'
  LEFT JOIN public.pillar_scores ps_oe ON ps_oe.assessment_id = l.assessment_id AND ps_oe.pillar = 'OE'
  LEFT JOIN public.pillar_scores ps_ao ON ps_ao.assessment_id = l.assessment_id AND ps_ao.pillar = 'AO';
$function$;