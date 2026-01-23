-- Create enterprise_indicator_values table for storing diagnostic data
CREATE TABLE IF NOT EXISTS public.enterprise_indicator_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.enterprise_indicators(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  value NUMERIC,
  value_text TEXT,
  reference_date DATE,
  source TEXT,
  notes TEXT,
  validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(indicator_id, assessment_id)
);

-- Enable RLS
ALTER TABLE public.enterprise_indicator_values ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view enterprise indicator values for their org"
ON public.enterprise_indicator_values
FOR SELECT
USING (org_id = get_effective_org_id());

CREATE POLICY "Users can insert enterprise indicator values for their org"
ON public.enterprise_indicator_values
FOR INSERT
WITH CHECK (org_id = get_effective_org_id());

CREATE POLICY "Users can update enterprise indicator values for their org"
ON public.enterprise_indicator_values
FOR UPDATE
USING (org_id = get_effective_org_id());

CREATE POLICY "Users can delete enterprise indicator values for their org"
ON public.enterprise_indicator_values
FOR DELETE
USING (org_id = get_effective_org_id());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_enterprise_indicator_values_assessment ON public.enterprise_indicator_values(assessment_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_indicator_values_indicator ON public.enterprise_indicator_values(indicator_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_indicator_values_org ON public.enterprise_indicator_values(org_id);

-- Add trigger for updated_at
CREATE TRIGGER update_enterprise_indicator_values_updated_at
  BEFORE UPDATE ON public.enterprise_indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();