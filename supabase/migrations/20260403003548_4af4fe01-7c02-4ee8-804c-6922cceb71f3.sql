
CREATE OR REPLACE FUNCTION public.get_license_status()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  org_id uuid,
  plan text,
  status text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,
  max_users integer,
  features jsonb,
  notes text,
  assigned_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  is_valid boolean,
  is_trial_active boolean,
  is_trial_expired boolean,
  is_paid_plan boolean,
  server_now timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.user_id,
    l.org_id,
    l.plan::text,
    l.status::text,
    l.trial_started_at,
    l.trial_ends_at,
    l.activated_at,
    l.expires_at,
    l.max_users,
    l.features,
    l.notes,
    l.assigned_by,
    l.created_at,
    l.updated_at,
    -- is_valid: trial active OR paid plan valid
    (
      -- Trial active
      (l.plan = 'trial' AND l.status = 'active' AND l.trial_ends_at IS NOT NULL AND l.trial_ends_at > NOW())
      OR
      -- Paid plan active or cancelled but not yet expired
      (l.plan IN ('estudante', 'professor', 'basic', 'pro', 'enterprise')
       AND l.status IN ('active', 'cancelled')
       AND (l.expires_at IS NULL OR l.expires_at > NOW()))
    ) AS is_valid,
    -- is_trial_active
    (l.plan = 'trial' AND l.status = 'active' AND l.trial_ends_at IS NOT NULL AND l.trial_ends_at > NOW()) AS is_trial_active,
    -- is_trial_expired
    (l.plan = 'trial' AND (l.status = 'expired' OR (l.trial_ends_at IS NOT NULL AND l.trial_ends_at <= NOW()))) AS is_trial_expired,
    -- is_paid_plan
    (l.plan IN ('estudante', 'professor', 'basic', 'pro', 'enterprise')
     AND l.status IN ('active', 'cancelled')
     AND (l.expires_at IS NULL OR l.expires_at > NOW())) AS is_paid_plan,
    NOW() AS server_now
  FROM public.licenses l
  WHERE l.user_id = v_user_id
  LIMIT 1;
END;
$$;
