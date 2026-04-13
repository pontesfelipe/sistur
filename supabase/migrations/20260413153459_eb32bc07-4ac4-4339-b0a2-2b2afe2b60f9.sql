
-- Exam appeals table for students to contest results
CREATE TABLE public.exam_appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(attempt_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  admin_response TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_appeals ENABLE ROW LEVEL SECURITY;

-- Students can create appeals for their own attempts
CREATE POLICY "Users can create their own appeals"
ON public.exam_appeals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Students can view their own appeals
CREATE POLICY "Users can view their own appeals"
ON public.exam_appeals FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'ADMIN')
  OR public.has_role(auth.uid(), 'ORG_ADMIN')
  OR public.has_role(auth.uid(), 'PROFESSOR')
);

-- Admins/professors can update appeals (resolve them)
CREATE POLICY "Admins can update appeals"
ON public.exam_appeals FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN')
  OR public.has_role(auth.uid(), 'ORG_ADMIN')
  OR public.has_role(auth.uid(), 'PROFESSOR')
);

-- Trigger for updated_at
CREATE TRIGGER update_exam_appeals_updated_at
BEFORE UPDATE ON public.exam_appeals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add scheduling fields to exam_rulesets
ALTER TABLE public.exam_rulesets 
ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;

-- Add grader comment to exam_answers for professor feedback
ALTER TABLE public.exam_answers 
ADD COLUMN IF NOT EXISTS grader_comment TEXT;
