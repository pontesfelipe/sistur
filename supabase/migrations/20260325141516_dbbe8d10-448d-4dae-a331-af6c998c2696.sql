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
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  
  SELECT id INTO standalone_org_id 
  FROM public.orgs 
  WHERE name = 'Autônomo' 
  ORDER BY created_at 
  LIMIT 1;
  
  IF standalone_org_id IS NULL THEN
    INSERT INTO public.orgs (name)
    VALUES ('Autônomo')
    RETURNING id INTO standalone_org_id;
  END IF;
  
  INSERT INTO public.profiles (user_id, org_id, full_name, pending_approval, approval_requested_at)
  VALUES (NEW.id, standalone_org_id, user_full_name, true, now());
  
  RETURN NEW;
END;
$function$