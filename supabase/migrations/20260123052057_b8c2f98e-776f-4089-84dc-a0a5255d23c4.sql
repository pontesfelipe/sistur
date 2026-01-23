-- Create enterprise_indicator_scores table for storing calculated scores
CREATE TABLE IF NOT EXISTS public.enterprise_indicator_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.enterprise_indicators(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 1),
  min_ref_used NUMERIC,
  max_ref_used NUMERIC,
  weight_used NUMERIC,
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, indicator_id)
);

-- Enable RLS
ALTER TABLE public.enterprise_indicator_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies using effective org for demo mode
CREATE POLICY "enterprise_indicator_scores_select"
  ON public.enterprise_indicator_scores FOR SELECT
  USING (org_id = get_effective_org_id());

CREATE POLICY "enterprise_indicator_scores_insert"
  ON public.enterprise_indicator_scores FOR INSERT
  WITH CHECK (org_id = get_effective_org_id());

CREATE POLICY "enterprise_indicator_scores_update"
  ON public.enterprise_indicator_scores FOR UPDATE
  USING (org_id = get_effective_org_id());

CREATE POLICY "enterprise_indicator_scores_delete"
  ON public.enterprise_indicator_scores FOR DELETE
  USING (org_id = get_effective_org_id());

-- Create index for performance
CREATE INDEX idx_enterprise_indicator_scores_assessment 
  ON public.enterprise_indicator_scores(assessment_id);

-- Add comment
COMMENT ON TABLE public.enterprise_indicator_scores IS 'Stores normalized scores for enterprise indicators after calculation';