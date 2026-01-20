-- Drop existing policies for edu_tracks
DROP POLICY IF EXISTS "Admins can manage edu tracks" ON public.edu_tracks;
DROP POLICY IF EXISTS "Users can view edu tracks" ON public.edu_tracks;

-- Create new policies that support demo mode

-- SELECT: Users can view global tracks (org_id IS NULL) or tracks from their effective org
CREATE POLICY "Users can view edu tracks"
ON public.edu_tracks FOR SELECT
USING (
  org_id IS NULL 
  OR org_id = public.get_effective_org_id()
);

-- INSERT: Users can create tracks in their effective org
CREATE POLICY "Users can create edu tracks"
ON public.edu_tracks FOR INSERT
WITH CHECK (
  org_id = public.get_effective_org_id()
);

-- UPDATE: Users can update tracks in their effective org
CREATE POLICY "Users can update edu tracks"
ON public.edu_tracks FOR UPDATE
USING (org_id = public.get_effective_org_id());

-- DELETE: Users can delete tracks in their effective org
CREATE POLICY "Users can delete edu tracks"
ON public.edu_tracks FOR DELETE
USING (org_id = public.get_effective_org_id());

-- Also update edu_track_trainings policies to support the new tracks

-- Check existing policies
DROP POLICY IF EXISTS "Users can manage track trainings" ON public.edu_track_trainings;
DROP POLICY IF EXISTS "Users can view track trainings" ON public.edu_track_trainings;

-- SELECT: Anyone can view track trainings for tracks they can see
CREATE POLICY "Users can view track trainings"
ON public.edu_track_trainings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.edu_tracks t
    WHERE t.id = edu_track_trainings.track_id
    AND (t.org_id IS NULL OR t.org_id = public.get_effective_org_id())
  )
);

-- INSERT: Users can add trainings to tracks they own
CREATE POLICY "Users can add track trainings"
ON public.edu_track_trainings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.edu_tracks t
    WHERE t.id = edu_track_trainings.track_id
    AND t.org_id = public.get_effective_org_id()
  )
);

-- UPDATE: Users can update trainings in tracks they own
CREATE POLICY "Users can update track trainings"
ON public.edu_track_trainings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.edu_tracks t
    WHERE t.id = edu_track_trainings.track_id
    AND t.org_id = public.get_effective_org_id()
  )
);

-- DELETE: Users can delete trainings from tracks they own
CREATE POLICY "Users can delete track trainings"
ON public.edu_track_trainings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.edu_tracks t
    WHERE t.id = edu_track_trainings.track_id
    AND t.org_id = public.get_effective_org_id()
  )
);