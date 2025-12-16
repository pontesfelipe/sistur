-- Create target_agent enum
CREATE TYPE public.target_agent AS ENUM ('GESTORES', 'TECNICOS', 'TRADE');

-- Add pillar column to courses (single pillar, not array)
ALTER TABLE public.courses 
ADD COLUMN pillar public.pillar_type,
ADD COLUMN target_agent public.target_agent DEFAULT 'GESTORES',
ADD COLUMN theme text;

-- Create prescriptions table for tracking learning prescriptions
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE SET NULL,
  pillar public.pillar_type NOT NULL,
  status public.severity_type NOT NULL,
  interpretation public.territorial_interpretation,
  justification text NOT NULL,
  target_agent public.target_agent NOT NULL DEFAULT 'GESTORES',
  priority integer NOT NULL DEFAULT 1,
  cycle_number integer NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on prescriptions
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for prescriptions
CREATE POLICY "Users can view prescriptions in their org"
ON public.prescriptions
FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "System can manage prescriptions"
ON public.prescriptions
FOR ALL
USING (user_belongs_to_org(auth.uid(), org_id) AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role)));

-- Create prescription_cycles table for monitoring evolution
CREATE TABLE public.prescription_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  previous_score numeric,
  current_score numeric,
  evolution_state text CHECK (evolution_state IN ('EVOLUTION', 'STAGNATION', 'REGRESSION')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on prescription_cycles
ALTER TABLE public.prescription_cycles ENABLE ROW LEVEL SECURITY;

-- RLS policies for prescription_cycles
CREATE POLICY "Users can view prescription cycles in their org"
ON public.prescription_cycles
FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "System can manage prescription cycles"
ON public.prescription_cycles
FOR ALL
USING (user_belongs_to_org(auth.uid(), org_id) AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role)));

-- Create index for faster queries
CREATE INDEX idx_prescriptions_assessment ON public.prescriptions(assessment_id);
CREATE INDEX idx_prescriptions_course ON public.prescriptions(course_id);
CREATE INDEX idx_prescription_cycles_prescription ON public.prescription_cycles(prescription_id);