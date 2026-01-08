-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Users can view edu trainings" ON public.edu_trainings;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view edu trainings" 
ON public.edu_trainings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (org_id IS NULL OR user_belongs_to_org(auth.uid(), org_id))
);