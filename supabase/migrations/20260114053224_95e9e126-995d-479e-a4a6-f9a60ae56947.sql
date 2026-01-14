
-- Drop all versions of complete_user_onboarding
DROP FUNCTION IF EXISTS public.complete_user_onboarding(UUID, public.system_access_type, public.app_role);
DROP FUNCTION IF EXISTS public.complete_user_onboarding(UUID, TEXT, TEXT);

-- Create single unified function
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  _user_id UUID,
  _system_access TEXT,
  _role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  -- Get user's org_id
  SELECT org_id INTO _org_id FROM public.profiles WHERE user_id = _user_id;
  
  IF _org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update profile with system access but keep pending_approval = true
  -- Admin will approve the user later
  UPDATE public.profiles 
  SET 
    system_access = _system_access::public.system_access_type,
    pending_approval = true,
    approval_requested_at = COALESCE(approval_requested_at, now()),
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Insert role if not exists
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role::public.user_role)
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role::public.user_role;
  
  RETURN true;
END;
$$;
