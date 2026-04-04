
-- Create "Temporário" org for unapproved users
INSERT INTO public.orgs (name) 
SELECT 'Temporário' WHERE NOT EXISTS (SELECT 1 FROM public.orgs WHERE name = 'Temporário');

-- Update handle_new_user to assign to "Temporário" instead of "Autônomo"
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  temp_org_id UUID;
  user_full_name TEXT;
BEGIN
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  
  SELECT id INTO temp_org_id 
  FROM public.orgs 
  WHERE name = 'Temporário' 
  ORDER BY created_at 
  LIMIT 1;
  
  IF temp_org_id IS NULL THEN
    INSERT INTO public.orgs (name)
    VALUES ('Temporário')
    RETURNING id INTO temp_org_id;
  END IF;
  
  INSERT INTO public.profiles (user_id, org_id, full_name, pending_approval, approval_requested_at)
  VALUES (NEW.id, temp_org_id, user_full_name, true, now());
  
  RETURN NEW;
END;
$function$;

-- Update admin_approve_user to move from "Temporário" to "Autônomo" if no specific org assigned
CREATE OR REPLACE FUNCTION public.admin_approve_user(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_org_id UUID;
  _temp_org_id UUID;
  _autonomo_org_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RETURN false;
  END IF;

  -- Get user's current org
  SELECT org_id INTO _current_org_id
  FROM public.profiles WHERE user_id = _user_id;

  -- Get Temporário org id
  SELECT id INTO _temp_org_id
  FROM public.orgs WHERE name = 'Temporário' LIMIT 1;

  -- If user is in Temporário, move to Autônomo
  IF _current_org_id IS NOT NULL AND _current_org_id = _temp_org_id THEN
    SELECT id INTO _autonomo_org_id
    FROM public.orgs WHERE name = 'Autônomo' ORDER BY created_at LIMIT 1;
    
    IF _autonomo_org_id IS NULL THEN
      INSERT INTO public.orgs (name) VALUES ('Autônomo')
      RETURNING id INTO _autonomo_org_id;
    END IF;

    UPDATE public.profiles 
    SET org_id = _autonomo_org_id,
        pending_approval = false,
        updated_at = now()
    WHERE user_id = _user_id;

    -- Also update user_roles org_id
    UPDATE public.user_roles
    SET org_id = _autonomo_org_id
    WHERE user_id = _user_id AND org_id = _temp_org_id;
  ELSE
    UPDATE public.profiles 
    SET pending_approval = false,
        updated_at = now()
    WHERE user_id = _user_id;
  END IF;
  
  RETURN true;
END;
$function$;

-- Move existing unapproved users from Autônomo to Temporário
UPDATE public.profiles 
SET org_id = (SELECT id FROM public.orgs WHERE name = 'Temporário' LIMIT 1)
WHERE pending_approval = true 
AND org_id = (SELECT id FROM public.orgs WHERE name = 'Autônomo' LIMIT 1);

-- Also update their user_roles
UPDATE public.user_roles
SET org_id = (SELECT id FROM public.orgs WHERE name = 'Temporário' LIMIT 1)
WHERE org_id = (SELECT id FROM public.orgs WHERE name = 'Autônomo' LIMIT 1)
AND user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE pending_approval = true 
  AND org_id = (SELECT id FROM public.orgs WHERE name = 'Temporário' LIMIT 1)
);
