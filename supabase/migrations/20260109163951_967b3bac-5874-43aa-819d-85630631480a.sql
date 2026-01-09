-- Fix action_plans RLS policies: swap argument order to match function signature
DROP POLICY IF EXISTS "Users can view action plans from their org" ON public.action_plans;
DROP POLICY IF EXISTS "Users can create action plans in their org" ON public.action_plans;
DROP POLICY IF EXISTS "Users can update action plans in their org" ON public.action_plans;
DROP POLICY IF EXISTS "Users can delete action plans in their org" ON public.action_plans;

CREATE POLICY "Users can view action plans from their org"
  ON public.action_plans
  FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can create action plans in their org"
  ON public.action_plans
  FOR INSERT
  WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update action plans in their org"
  ON public.action_plans
  FOR UPDATE
  USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can delete action plans in their org"
  ON public.action_plans
  FOR DELETE
  USING (user_belongs_to_org(auth.uid(), org_id));