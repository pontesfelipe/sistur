
-- Add demo mode column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS viewing_demo_org_id UUID DEFAULT NULL;

-- Create demo org if not exists and get reference
DO $$
DECLARE
  demo_org_id UUID;
  demo_user_id UUID;
BEGIN
  -- Create or get demo org
  INSERT INTO public.orgs (name)
  VALUES ('Demo SISTUR')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO demo_org_id FROM public.orgs WHERE name = 'Demo SISTUR';
  
  -- If no demo org was created, find the SISTUR org (which has the existing data)
  IF demo_org_id IS NULL THEN
    SELECT id INTO demo_org_id FROM public.orgs WHERE name = 'SISTUR';
  END IF;
  
  -- Store demo org id for reference
  RAISE NOTICE 'Demo org_id: %', demo_org_id;
END $$;

-- Create a function to get the effective org_id for data queries
CREATE OR REPLACE FUNCTION public.get_effective_org_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
  demo_org UUID;
BEGIN
  -- Get user's viewing_demo_org_id if set
  SELECT viewing_demo_org_id INTO demo_org
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- If viewing demo data, return demo org
  IF demo_org IS NOT NULL THEN
    RETURN demo_org;
  END IF;
  
  -- Otherwise return user's own org
  SELECT org_id INTO user_org_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  RETURN user_org_id;
END;
$$;

-- Create function to toggle demo mode
CREATE OR REPLACE FUNCTION public.toggle_demo_mode(_enable BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_org UUID;
BEGIN
  IF _enable THEN
    -- Get SISTUR org (which has the demo data)
    SELECT id INTO demo_org FROM public.orgs WHERE name = 'SISTUR';
    
    UPDATE public.profiles
    SET viewing_demo_org_id = demo_org
    WHERE user_id = auth.uid();
  ELSE
    UPDATE public.profiles
    SET viewing_demo_org_id = NULL
    WHERE user_id = auth.uid();
  END IF;
  
  RETURN true;
END;
$$;
