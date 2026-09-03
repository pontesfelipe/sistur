CREATE OR REPLACE FUNCTION public.admin_recent_logins(_from timestamptz, _to timestamptz, _limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, full_name text, last_sign_in_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.full_name, au.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE au.last_sign_in_at IS NOT NULL
    AND au.last_sign_in_at >= _from
    AND au.last_sign_in_at <= _to
  ORDER BY au.last_sign_in_at DESC
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_recent_logins(timestamptz, timestamptz, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recent_logins(timestamptz, timestamptz, int) TO authenticated;