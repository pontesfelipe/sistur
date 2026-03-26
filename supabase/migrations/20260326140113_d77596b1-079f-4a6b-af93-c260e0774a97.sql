
-- Add cancellation columns to licenses table
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS cancelled_at timestamptz DEFAULT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS cancellation_reason text DEFAULT NULL;

-- Function for users to cancel their own license
CREATE OR REPLACE FUNCTION public.cancel_my_license(p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_license public.licenses%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_license
  FROM public.licenses
  WHERE user_id = v_user_id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_active_license';
  END IF;

  IF v_license.plan = 'trial' THEN
    -- Trial: cancel immediately (set status to cancelled)
    UPDATE public.licenses
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = v_license.id;
  ELSE
    -- Paid plan: keep access until expires_at, mark as cancelled
    UPDATE public.licenses
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        -- If no expires_at, set it to end of current month
        expires_at = COALESCE(expires_at, (date_trunc('month', now()) + interval '1 month - 1 day')::timestamptz),
        updated_at = now()
    WHERE id = v_license.id;
  END IF;
END;
$$;

-- Function for admins to cancel any user's license
CREATE OR REPLACE FUNCTION public.admin_cancel_license(p_license_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.licenses
  SET status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason,
      expires_at = COALESCE(expires_at, (date_trunc('month', now()) + interval '1 month - 1 day')::timestamptz),
      updated_at = now()
  WHERE id = p_license_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'license_not_found_or_inactive';
  END IF;
END;
$$;
