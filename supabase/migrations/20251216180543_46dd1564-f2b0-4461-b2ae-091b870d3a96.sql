-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert audit events" ON public.audit_events;

-- Create a more restrictive INSERT policy that only allows ADMIN or ANALYST roles
CREATE POLICY "Admins and Analysts can insert audit events" 
ON public.audit_events 
FOR INSERT 
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id) 
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'ANALYST'::app_role)
  )
);