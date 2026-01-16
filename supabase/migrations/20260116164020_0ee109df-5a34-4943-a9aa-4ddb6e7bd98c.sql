-- Create feedback table for feature suggestions and bug reports
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('feature', 'bug')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'planned', 'in_progress', 'completed', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  admin_notes TEXT,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON public.user_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.user_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.user_feedback
FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Admins can update all feedback
CREATE POLICY "Admins can update all feedback"
ON public.user_feedback
FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
ON public.user_feedback
FOR DELETE
USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_feedback_updated_at
BEFORE UPDATE ON public.user_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();