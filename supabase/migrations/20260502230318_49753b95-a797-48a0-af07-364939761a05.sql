-- Defense in depth: force RLS and revoke direct grants for client roles
ALTER TABLE public.email_send_log FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_send_log FROM anon, authenticated;

-- Admin-callable retention cleanup (no client policy needed; runs as definer)
CREATE OR REPLACE FUNCTION public.cleanup_email_send_log(p_retention_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_retention_days IS NULL OR p_retention_days < 30 THEN
    RAISE EXCEPTION 'retention_must_be_at_least_30_days';
  END IF;

  DELETE FROM public.email_send_log
  WHERE created_at < now() - make_interval(days => p_retention_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_email_send_log(integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_email_send_log(integer) TO authenticated;