-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert assessments in their org" ON public.assessments;

-- Create new INSERT policy that supports demo mode using get_effective_org_id()
CREATE POLICY "Users can insert assessments in their org" 
ON public.assessments 
FOR INSERT 
WITH CHECK (org_id = get_effective_org_id());