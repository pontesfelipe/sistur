-- Fix: New users should be added to the main SISTUR organization instead of creating separate orgs
-- This allows admins to see and approve pending users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  main_org_id UUID;
  user_full_name TEXT;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Get the main SISTUR organization (first org created, named 'SISTUR')
  SELECT id INTO main_org_id 
  FROM public.orgs 
  WHERE name = 'SISTUR' 
  ORDER BY created_at 
  LIMIT 1;
  
  -- If no SISTUR org exists, create one
  IF main_org_id IS NULL THEN
    INSERT INTO public.orgs (name)
    VALUES ('SISTUR')
    RETURNING id INTO main_org_id;
  END IF;
  
  -- Create profile with pending_approval = true (user needs admin approval)
  INSERT INTO public.profiles (user_id, org_id, full_name, pending_approval, approval_requested_at)
  VALUES (NEW.id, main_org_id, user_full_name, true, now());
  
  -- Don't assign role yet - admin will approve and assign role
  
  RETURN NEW;
END;
$$;

-- Also fix the pending user: move them to the main SISTUR org
UPDATE public.profiles 
SET org_id = '5d08593f-6f82-4737-857b-070f0fc1fe90'
WHERE user_id = 'e8e53869-387e-45ff-9392-da57c7696223' 
AND pending_approval = true;