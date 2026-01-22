-- Fix RLS policies for diagnosis_data_snapshots to use get_effective_org_id() for demo mode support
DROP POLICY IF EXISTS "Users can create snapshots for their org" ON public.diagnosis_data_snapshots;
DROP POLICY IF EXISTS "Users can view snapshots from their org" ON public.diagnosis_data_snapshots;

-- INSERT policy using get_effective_org_id()
CREATE POLICY "Users can create snapshots for their org" 
ON public.diagnosis_data_snapshots 
FOR INSERT 
WITH CHECK (org_id = get_effective_org_id());

-- SELECT policy using get_effective_org_id()
CREATE POLICY "Users can view snapshots from their org" 
ON public.diagnosis_data_snapshots 
FOR SELECT 
USING (org_id = get_effective_org_id());