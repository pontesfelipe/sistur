
-- 1. Add is_demo column to orgs table
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- Mark the known demo org
UPDATE public.orgs SET is_demo = true WHERE name = 'Demo SISTUR';

-- 2. Create secure RPC to set viewing_demo_org_id
CREATE OR REPLACE FUNCTION public.set_demo_org_id(target_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Must be ADMIN
  IF NOT has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;

  -- If target is NULL, just clear
  IF target_org_id IS NULL THEN
    UPDATE public.profiles
    SET viewing_demo_org_id = NULL, updated_at = now()
    WHERE user_id = auth.uid();
    RETURN;
  END IF;

  -- Validate target org exists and is a demo org OR the user belongs to it
  IF NOT EXISTS (
    SELECT 1 FROM public.orgs
    WHERE id = target_org_id
    AND (is_demo = true OR id IN (
      SELECT org_id FROM public.profiles WHERE user_id = auth.uid()
    ))
  ) THEN
    RAISE EXCEPTION 'invalid_org: target organization is not accessible';
  END IF;

  UPDATE public.profiles
  SET viewing_demo_org_id = target_org_id, updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- 3. Update toggle_demo_mode to also validate
CREATE OR REPLACE FUNCTION public.toggle_demo_mode(_enable boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _demo_org_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _enable THEN
    -- Find the demo org dynamically
    SELECT id INTO _demo_org_id
    FROM public.orgs
    WHERE is_demo = true
    LIMIT 1;

    IF _demo_org_id IS NULL THEN
      RAISE EXCEPTION 'no_demo_org_configured';
    END IF;

    UPDATE profiles
    SET viewing_demo_org_id = _demo_org_id
    WHERE user_id = auth.uid();
  ELSE
    UPDATE profiles
    SET viewing_demo_org_id = NULL
    WHERE user_id = auth.uid();
  END IF;
END;
$$;

-- 4. Restrict direct UPDATE of viewing_demo_org_id on profiles
-- Drop the existing permissive self-update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Re-create it but prevent changing viewing_demo_org_id
-- Users can update their own profile but viewing_demo_org_id must remain unchanged
CREATE POLICY "Users can update own profile safe fields"
ON public.profiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

-- Create a trigger to prevent direct changes to viewing_demo_org_id from non-SECURITY DEFINER context
CREATE OR REPLACE FUNCTION public.protect_viewing_demo_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If viewing_demo_org_id is being changed and the caller is not a security definer function
  -- we detect this by checking if the current_setting indicates a direct client call
  IF OLD.viewing_demo_org_id IS DISTINCT FROM NEW.viewing_demo_org_id THEN
    -- Check if the invoker has admin role
    IF NOT has_role(auth.uid(), 'ADMIN'::app_role) THEN
      -- Non-admin users cannot change this field
      NEW.viewing_demo_org_id := OLD.viewing_demo_org_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_viewing_demo_org_id_trigger ON public.profiles;
CREATE TRIGGER protect_viewing_demo_org_id_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_viewing_demo_org_id();
