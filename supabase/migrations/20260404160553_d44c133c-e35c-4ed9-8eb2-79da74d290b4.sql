
-- Fix 1: Validate demo org in get_effective_org_id()
CREATE OR REPLACE FUNCTION public.get_effective_org_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_org_id UUID;
  demo_org UUID;
BEGIN
  SELECT viewing_demo_org_id INTO demo_org
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Only return demo_org if it actually references a demo organization
  IF demo_org IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.orgs WHERE id = demo_org AND is_demo = true) THEN
      RETURN demo_org;
    END IF;
    -- If viewing_demo_org_id points to a non-demo org, ignore it
  END IF;
  
  SELECT org_id INTO user_org_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  RETURN user_org_id;
END;
$function$;

-- Fix 2: Tighten KB storage DELETE policy to org-scoped paths
DROP POLICY IF EXISTS "Users can delete KB files" ON storage.objects;
CREATE POLICY "Users can delete KB files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'knowledge-base'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Also tighten INSERT and SELECT policies for consistency
DROP POLICY IF EXISTS "Users can upload KB files" ON storage.objects;
CREATE POLICY "Users can upload KB files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-base'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can read KB files" ON storage.objects;
CREATE POLICY "Users can read KB files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'knowledge-base'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );
