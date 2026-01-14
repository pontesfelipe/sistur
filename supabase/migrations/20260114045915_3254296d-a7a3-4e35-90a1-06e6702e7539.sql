
-- Update RLS policies to use get_effective_org_id() for viewing demo data

-- Drop and recreate destinations policies
DROP POLICY IF EXISTS "Users can view destinations in their org" ON public.destinations;
CREATE POLICY "Users can view destinations in their org or demo" ON public.destinations
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate assessments policies  
DROP POLICY IF EXISTS "Users can view assessments in their org" ON public.assessments;
CREATE POLICY "Users can view assessments in their org or demo" ON public.assessments
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate pillar_scores policies
DROP POLICY IF EXISTS "Users can view pillar_scores in their org" ON public.pillar_scores;
CREATE POLICY "Users can view pillar_scores in their org or demo" ON public.pillar_scores
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate indicator_scores policies
DROP POLICY IF EXISTS "Users can view indicator_scores in their org" ON public.indicator_scores;
CREATE POLICY "Users can view indicator_scores in their org or demo" ON public.indicator_scores
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate issues policies
DROP POLICY IF EXISTS "Users can view issues in their org" ON public.issues;
CREATE POLICY "Users can view issues in their org or demo" ON public.issues
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate prescriptions policies
DROP POLICY IF EXISTS "Users can view prescriptions in their org" ON public.prescriptions;
CREATE POLICY "Users can view prescriptions in their org or demo" ON public.prescriptions
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate recommendations policies
DROP POLICY IF EXISTS "Users can view recommendations in their org" ON public.recommendations;
CREATE POLICY "Users can view recommendations in their org or demo" ON public.recommendations
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate action_plans policies
DROP POLICY IF EXISTS "Users can view action_plans in their org" ON public.action_plans;
CREATE POLICY "Users can view action_plans in their org or demo" ON public.action_plans
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate alerts policies
DROP POLICY IF EXISTS "Users can view alerts in their org" ON public.alerts;
CREATE POLICY "Users can view alerts in their org or demo" ON public.alerts
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate indicator_values policies
DROP POLICY IF EXISTS "Users can view indicator_values in their org" ON public.indicator_values;
CREATE POLICY "Users can view indicator_values in their org or demo" ON public.indicator_values
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate external_indicator_values policies
DROP POLICY IF EXISTS "Users can view external_indicator_values in their org" ON public.external_indicator_values;
CREATE POLICY "Users can view external_indicator_values in their org or demo" ON public.external_indicator_values
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Drop and recreate courses policies
DROP POLICY IF EXISTS "Users can view courses in their org or global" ON public.courses;
CREATE POLICY "Users can view courses in their org demo or global" ON public.courses
  FOR SELECT USING (org_id IS NULL OR org_id = public.get_effective_org_id());
