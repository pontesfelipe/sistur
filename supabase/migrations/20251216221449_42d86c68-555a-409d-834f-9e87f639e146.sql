-- Add edu_trainings table (unified structure for courses + lives)
CREATE TABLE IF NOT EXISTS public.edu_trainings (
  training_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('course', 'live')),
  pillar TEXT NOT NULL CHECK (pillar IN ('RA', 'OE', 'AO')),
  level TEXT,
  target_audience TEXT,
  course_code TEXT,
  objective TEXT,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  org_id UUID REFERENCES public.orgs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add edu_indicator_training_map table
CREATE TABLE IF NOT EXISTS public.edu_indicator_training_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code TEXT NOT NULL,
  training_id TEXT NOT NULL REFERENCES public.edu_trainings(training_id),
  pillar TEXT NOT NULL CHECK (pillar IN ('RA', 'OE', 'AO')),
  status_trigger JSONB NOT NULL DEFAULT '["ATENCAO", "CRITICO"]'::jsonb,
  interpretation_trigger TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  reason_template TEXT NOT NULL DEFAULT 'Prescrito porque o indicador {indicator} está {status} no pilar {pillar}.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edu_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_indicator_training_map ENABLE ROW LEVEL SECURITY;

-- RLS policies for edu_trainings
CREATE POLICY "Users can view edu trainings"
  ON public.edu_trainings FOR SELECT
  USING ((org_id IS NULL) OR user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage edu trainings"
  ON public.edu_trainings FOR ALL
  USING ((org_id IS NOT NULL) AND user_belongs_to_org(auth.uid(), org_id) AND has_role(auth.uid(), 'ADMIN'::app_role));

-- RLS policies for edu_indicator_training_map
CREATE POLICY "Users can view indicator training map"
  ON public.edu_indicator_training_map FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage indicator training map"
  ON public.edu_indicator_training_map FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_edu_trainings_pillar ON public.edu_trainings(pillar);
CREATE INDEX IF NOT EXISTS idx_edu_trainings_type ON public.edu_trainings(type);
CREATE INDEX IF NOT EXISTS idx_edu_indicator_training_map_indicator ON public.edu_indicator_training_map(indicator_code);
CREATE INDEX IF NOT EXISTS idx_edu_indicator_training_map_training ON public.edu_indicator_training_map(training_id);