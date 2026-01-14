-- Drop and recreate toggle_demo_mode
DROP FUNCTION IF EXISTS public.toggle_demo_mode(BOOLEAN);

CREATE FUNCTION public.toggle_demo_mode(_enable BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _demo_org_id UUID := '65e0f76b-ce6d-4a17-8fae-32e306a17710'; -- Demo SISTUR org
BEGIN
  IF _enable THEN
    UPDATE profiles
    SET viewing_demo_org_id = _demo_org_id
    WHERE user_id = auth.uid();
  ELSE
    UPDATE profiles
    SET viewing_demo_org_id = NULL
    WHERE user_id = auth.uid();
  END IF;
END;
$$