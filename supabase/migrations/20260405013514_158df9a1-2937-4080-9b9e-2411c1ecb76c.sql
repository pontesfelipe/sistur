
-- Org referral codes table
CREATE TABLE public.org_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_referral_codes ENABLE ROW LEVEL SECURITY;

-- ORG_ADMIN or ADMIN can manage their org codes
CREATE POLICY "org_admins_manage_referral_codes" ON public.org_referral_codes
  FOR ALL TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ORG_ADMIN') OR public.has_role(auth.uid(), 'ADMIN'))
  )
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ORG_ADMIN') OR public.has_role(auth.uid(), 'ADMIN'))
  );

-- Anyone authenticated can read codes (needed for validation)
CREATE POLICY "anyone_can_read_codes" ON public.org_referral_codes
  FOR SELECT TO authenticated
  USING (is_active = true);

-- RPC to link a user to an org via referral code
CREATE OR REPLACE FUNCTION public.link_user_to_org_by_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code_record RECORD;
  v_current_org_id UUID;
  v_temp_org_id UUID;
  v_autonomo_org_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Find the code
  SELECT * INTO v_code_record
  FROM public.org_referral_codes
  WHERE code = UPPER(TRIM(p_code)) AND is_active = true;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get user's current org
  SELECT org_id INTO v_current_org_id
  FROM public.profiles WHERE user_id = v_user_id;

  -- Cannot join your own org
  IF v_current_org_id = v_code_record.org_id THEN
    RETURN FALSE;
  END IF;

  -- Move user to the new org
  UPDATE public.profiles
  SET org_id = v_code_record.org_id,
      pending_approval = false,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Update user_roles org_id too
  UPDATE public.user_roles
  SET org_id = v_code_record.org_id
  WHERE user_id = v_user_id;

  RETURN TRUE;
END;
$$;
