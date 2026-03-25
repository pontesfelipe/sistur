CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  standalone_org_id UUID;
  user_full_name TEXT;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Get the Standalone organization for unaffiliated users
  SELECT id INTO standalone_org_id 
  FROM public.orgs 
  WHERE name = 'Standalone' 
  ORDER BY created_at 
  LIMIT 1;
  
  -- If no Standalone org exists, create one
  IF standalone_org_id IS NULL THEN
    INSERT INTO public.orgs (name)
    VALUES ('Standalone')
    RETURNING id INTO standalone_org_id;
  END IF;
  
  -- Create profile with pending_approval = true (user needs admin approval)
  INSERT INTO public.profiles (user_id, org_id, full_name, pending_approval, approval_requested_at)
  VALUES (NEW.id, standalone_org_id, user_full_name, true, now());
  
  -- Don't assign role yet - admin will approve and assign role
  
  RETURN NEW;
END;
$function$