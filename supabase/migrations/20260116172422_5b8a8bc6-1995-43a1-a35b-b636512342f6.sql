-- Add RLS policy for generated_reports that respects demo mode
CREATE POLICY "Users can view reports in their org or demo" 
ON public.generated_reports 
FOR SELECT 
USING (org_id = get_effective_org_id());

-- Also ensure the existing policy allows proper access
-- Drop and recreate if needed
DROP POLICY IF EXISTS "Users can view reports in their org" ON public.generated_reports;

CREATE POLICY "Users can view reports in their org" 
ON public.generated_reports 
FOR SELECT 
USING (user_belongs_to_org(auth.uid(), org_id));