-- Fix profiles table: explicitly require authentication
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
CREATE POLICY "Users can view profiles in their org" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), org_id)
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- Fix orgs table: explicitly require authentication
DROP POLICY IF EXISTS "Users can view their own org" ON public.orgs;
CREATE POLICY "Users can view their own org" 
ON public.orgs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), id)
);

DROP POLICY IF EXISTS "Admins can update their org" ON public.orgs;
CREATE POLICY "Admins can update their org" 
ON public.orgs 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), id) 
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Fix audit_events table: explicitly require authentication
DROP POLICY IF EXISTS "Admins can view audit events in their org" ON public.audit_events;
CREATE POLICY "Admins can view audit events in their org" 
ON public.audit_events 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), org_id) 
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);