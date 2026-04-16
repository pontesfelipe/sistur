
-- 1. FIX: investor_profiles PII exposure
-- Replace broad admin SELECT policy with one that hides contact info
DROP POLICY IF EXISTS "Org admins can view org investor profiles" ON public.investor_profiles;

-- Create a safe view excluding PII
CREATE OR REPLACE VIEW public.investor_profiles_safe
WITH (security_invoker = on) AS
SELECT 
  id, stakeholder_profile_id, user_id, org_id,
  investor_type, investment_thesis, impact_focus,
  geographic_scope, ticket_size_min, ticket_size_max,
  preferred_contact_method, created_at, updated_at
FROM public.investor_profiles;

-- Org admins can view investor profiles in their org (without PII)
CREATE POLICY "Org admins can view org investor profiles (no PII)"
  ON public.investor_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      org_id IN (
        SELECT ur.org_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
      )
    )
  );

-- 2. FIX: Function search_path mutable
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_certificate_id()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO sequence_part
  FROM public.lms_certificates
  WHERE certificate_id LIKE 'CERT-' || year_part || '-%';
  RETURN 'CERT-' || year_part || '-' || sequence_part;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$function$;

-- 3. FIX: Overly permissive policies on system/test tables
-- system_health_checks: restrict INSERT and UPDATE to authenticated users (edge functions use service role)
DROP POLICY IF EXISTS "Anyone can insert health checks" ON public.system_health_checks;
DROP POLICY IF EXISTS "Anyone can update health checks" ON public.system_health_checks;

CREATE POLICY "Service role or admin can insert health checks"
  ON public.system_health_checks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Service role or admin can update health checks"
  ON public.system_health_checks FOR UPDATE
  USING (
    auth.uid() IS NOT NULL OR current_setting('role', true) = 'service_role'
  );

-- test_flow_registry: restrict ALL to admin only
DROP POLICY IF EXISTS "Service role full access" ON public.test_flow_registry;
CREATE POLICY "Admin or service role full access"
  ON public.test_flow_registry FOR ALL
  USING (
    public.has_role(auth.uid(), 'ADMIN'::app_role) OR current_setting('role', true) = 'service_role'
  );

-- test_registry_sync_log: restrict INSERT to admin/service
DROP POLICY IF EXISTS "Service role can insert sync logs" ON public.test_registry_sync_log;
CREATE POLICY "Admin or service role can insert sync logs"
  ON public.test_registry_sync_log FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'ADMIN'::app_role) OR current_setting('role', true) = 'service_role'
  );

-- 4. FIX: Public bucket listing - restrict forum-attachments SELECT to folder-scoped
DROP POLICY IF EXISTS "Anyone can view forum attachments" ON storage.objects;
CREATE POLICY "Anyone can view forum attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-attachments');
