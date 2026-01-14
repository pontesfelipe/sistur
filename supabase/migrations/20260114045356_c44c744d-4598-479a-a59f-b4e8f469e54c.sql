
-- Drop and recreate the complete_user_onboarding function with correct ON CONFLICT
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
  -- Get the user's org_id from profiles
  SELECT org_id INTO _org_id FROM public.profiles WHERE user_id = _user_id;
  
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found or missing org_id';
  END IF;
  
  -- Update profile with system access and set onboarding as complete
  UPDATE public.profiles
  SET 
    system_access = _system_access,
    onboarding_completed = true,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Insert role if not exists using the correct unique constraint (user_id, org_id)
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role::user_role)
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;
  
  RETURN true;
END;
$$;
