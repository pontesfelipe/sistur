-- Create table for storing generated reports
CREATE TABLE public.generated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  assessment_id UUID NOT NULL,
  destination_name TEXT NOT NULL,
  report_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Users can view reports in their org
CREATE POLICY "Users can view reports in their org"
ON public.generated_reports
FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

-- Admins/Analysts can create reports
CREATE POLICY "Admins/Analysts can create reports"
ON public.generated_reports
FOR INSERT
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id) 
  AND (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'ANALYST'))
);

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.generated_reports
FOR DELETE
USING (
  user_belongs_to_org(auth.uid(), org_id) 
  AND has_role(auth.uid(), 'ADMIN')
);