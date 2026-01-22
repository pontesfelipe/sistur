-- Fix DELETE policy for assessments to use get_effective_org_id() for demo mode support
DROP POLICY IF EXISTS "Users can delete their own assessments" ON public.assessments;

CREATE POLICY "Users can delete their own assessments" 
ON public.assessments 
FOR DELETE 
USING (
  org_id = get_effective_org_id() 
  AND (
    visibility = 'organization'::text 
    OR (visibility = 'personal'::text AND creator_user_id = auth.uid())
  )
);