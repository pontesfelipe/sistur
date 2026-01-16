-- Fix: Remove ANALYST role from audit_events INSERT policy
-- Only ADMIN should be able to insert audit events to prevent tampering

DROP POLICY IF EXISTS "Admins and Analysts can insert audit events" ON public.audit_events;

CREATE POLICY "Only Admins can insert audit events" 
ON public.audit_events 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_belongs_to_org(auth.uid(), org_id) 
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Also add immutable protection trigger to prevent tampering (like lms_audit_logs has)
CREATE TRIGGER prevent_audit_events_modification
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();