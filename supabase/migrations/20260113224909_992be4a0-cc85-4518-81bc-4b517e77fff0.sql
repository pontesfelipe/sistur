-- Fix security definer view issue
DROP VIEW IF EXISTS public_destination_summary;

CREATE VIEW public_destination_summary 
WITH (security_invoker = true) AS
SELECT
  d.id as destination_id,
  d.name,
  d.uf,
  d.ibge_code,
  d.latitude,
  d.longitude,
  a.id as latest_assessment_id,
  a.calculated_at as latest_assessment_date,
  
  -- Pillar scores (as JSON for easy consumption)
  (
    SELECT jsonb_object_agg(ps.pillar, jsonb_build_object('score', ps.score, 'severity', ps.severity))
    FROM pillar_scores ps
    WHERE ps.assessment_id = a.id
  ) as pillar_scores,
  
  -- Impact scores
  tis.territorial_impact_index,
  tis.certification_level,
  tis.esg_score,
  tis.sdg_alignments,
  tis.environmental_impact,
  tis.social_impact,
  tis.institutional_impact,
  tis.economic_impact,
  tis.certification_eligible,
  
  -- IGMA filtering (ready for visitors if RA & AO not critical)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pillar_scores ps
      WHERE ps.assessment_id = a.id
      AND ps.pillar = 'RA' AND ps.severity = 'CRITICO'
    ) THEN FALSE
    WHEN EXISTS (
      SELECT 1 FROM pillar_scores ps
      WHERE ps.assessment_id = a.id
      AND ps.pillar = 'AO' AND ps.severity = 'CRITICO'
    ) THEN FALSE
    ELSE TRUE
  END as ready_for_visitors,
  
  -- Count of indicators used
  (
    SELECT COUNT(DISTINCT iv.indicator_id)
    FROM indicator_values iv
    WHERE iv.assessment_id = a.id
  ) as indicator_count
  
FROM destinations d
INNER JOIN assessments a ON a.destination_id = d.id AND a.status = 'CALCULATED'
LEFT JOIN territorial_impact_scores tis ON tis.assessment_id = a.id
WHERE a.calculated_at = (
  SELECT MAX(a2.calculated_at)
  FROM assessments a2
  WHERE a2.destination_id = d.id AND a2.status = 'CALCULATED'
);