-- Add visibility scope to destinations and assessments
-- 'organization' = visible to all org members
-- 'personal' = visible only to the creator

-- Add visibility column to destinations
ALTER TABLE public.destinations 
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'organization' CHECK (visibility IN ('organization', 'personal'));

-- Add creator_user_id to destinations for personal visibility
ALTER TABLE public.destinations 
ADD COLUMN creator_user_id UUID REFERENCES auth.users(id);

-- Add visibility column to assessments
ALTER TABLE public.assessments 
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'organization' CHECK (visibility IN ('organization', 'personal'));

-- Add creator_user_id to assessments for personal visibility
ALTER TABLE public.assessments 
ADD COLUMN creator_user_id UUID REFERENCES auth.users(id);

-- Update existing RLS policies for destinations to respect visibility
DROP POLICY IF EXISTS "Users can view destinations from their org" ON public.destinations;
CREATE POLICY "Users can view destinations based on visibility"
ON public.destinations
FOR SELECT
USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  AND (
    visibility = 'organization' 
    OR (visibility = 'personal' AND creator_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert destinations in their org" ON public.destinations;
CREATE POLICY "Users can insert destinations in their org"
ON public.destinations
FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update destinations in their org" ON public.destinations;
CREATE POLICY "Users can update their own or org destinations"
ON public.destinations
FOR UPDATE
USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  AND (
    visibility = 'organization' 
    OR (visibility = 'personal' AND creator_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete destinations in their org" ON public.destinations;
CREATE POLICY "Users can delete their own personal destinations"
ON public.destinations
FOR DELETE
USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  AND (
    visibility = 'organization' 
    OR (visibility = 'personal' AND creator_user_id = auth.uid())
  )
);

-- Update existing RLS policies for assessments to respect visibility
DROP POLICY IF EXISTS "Users can view assessments from their org" ON public.assessments;
CREATE POLICY "Users can view assessments based on visibility"
ON public.assessments
FOR SELECT
USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  AND (
    visibility = 'organization' 
    OR (visibility = 'personal' AND creator_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert assessments in their org" ON public.assessments;
CREATE POLICY "Users can insert assessments in their org"
ON public.assessments
FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update assessments in their org" ON public.assessments;
CREATE POLICY "Users can update their own or org assessments"
ON public.assessments
FOR UPDATE
USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  AND (
    visibility = 'organization' 
    OR (visibility = 'personal' AND creator_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete assessments in their org" ON public.assessments;
CREATE POLICY "Users can delete their own assessments"
ON public.assessments
FOR DELETE
USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  AND (
    visibility = 'organization' 
    OR (visibility = 'personal' AND creator_user_id = auth.uid())
  )
);