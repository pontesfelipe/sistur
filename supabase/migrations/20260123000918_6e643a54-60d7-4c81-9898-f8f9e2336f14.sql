-- Fix foreign key constraint to allow cascade delete of assessments
ALTER TABLE public.alerts 
DROP CONSTRAINT IF EXISTS alerts_assessment_id_fkey;

ALTER TABLE public.alerts
ADD CONSTRAINT alerts_assessment_id_fkey 
FOREIGN KEY (assessment_id) 
REFERENCES public.assessments(id) 
ON DELETE CASCADE;

-- Also fix other tables that reference assessments
ALTER TABLE public.action_plans
DROP CONSTRAINT IF EXISTS action_plans_assessment_id_fkey;

ALTER TABLE public.action_plans
ADD CONSTRAINT action_plans_assessment_id_fkey 
FOREIGN KEY (assessment_id) 
REFERENCES public.assessments(id) 
ON DELETE CASCADE;

ALTER TABLE public.community_feedback
DROP CONSTRAINT IF EXISTS community_feedback_assessment_id_fkey;

ALTER TABLE public.community_feedback
ADD CONSTRAINT community_feedback_assessment_id_fkey 
FOREIGN KEY (assessment_id) 
REFERENCES public.assessments(id) 
ON DELETE CASCADE;

ALTER TABLE public.destination_certifications
DROP CONSTRAINT IF EXISTS destination_certifications_assessment_id_fkey;

ALTER TABLE public.destination_certifications
ADD CONSTRAINT destination_certifications_assessment_id_fkey 
FOREIGN KEY (assessment_id) 
REFERENCES public.assessments(id) 
ON DELETE CASCADE;

ALTER TABLE public.diagnosis_data_snapshots
DROP CONSTRAINT IF EXISTS diagnosis_data_snapshots_assessment_id_fkey;

ALTER TABLE public.diagnosis_data_snapshots
ADD CONSTRAINT diagnosis_data_snapshots_assessment_id_fkey 
FOREIGN KEY (assessment_id) 
REFERENCES public.assessments(id) 
ON DELETE CASCADE;