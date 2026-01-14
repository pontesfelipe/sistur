-- Update complete_user_onboarding to keep pending_approval = true
-- The admin will manually approve users later
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  _user_id uuid,
  _system_access public.system_access_type,
  _role public.app_role DEFAULT 'VIEWER'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _org_id uuid;
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
    system_access = _system_access,
    pending_approval = true,  -- Keep as pending until admin approves
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Insert role if not exists
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Create function for admin to approve users
CREATE OR REPLACE FUNCTION public.admin_approve_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow admins to approve users
  IF NOT has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RETURN false;
  END IF;
  
  -- Approve user
  UPDATE public.profiles 
  SET 
    pending_approval = false,
    updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN true;
END;
$$;