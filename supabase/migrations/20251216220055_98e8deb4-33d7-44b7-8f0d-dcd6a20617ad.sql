-- Create enum for live classification types
CREATE TYPE public.live_type AS ENUM ('primary', 'case', 'complementary');

-- Create enum for recommendation entity types
CREATE TYPE public.recommendation_entity_type AS ENUM ('course', 'live', 'track');

-- ============================================
-- EDU COURSES (new structure, separate from existing courses)
-- ============================================
CREATE TABLE public.edu_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  pillar public.pillar_type NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  suggested_hours INTEGER,
  certification TEXT,
  audience public.target_agent DEFAULT 'GESTORES',
  description TEXT,
  url TEXT,
  org_id UUID REFERENCES public.orgs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;

-- Users can view all edu_courses (global catalog)
CREATE POLICY "Users can view edu courses"
  ON public.edu_courses FOR SELECT
  USING (org_id IS NULL OR user_belongs_to_org(auth.uid(), org_id));

-- Admins can manage org edu_courses
CREATE POLICY "Admins can manage edu courses"
  ON public.edu_courses FOR ALL
  USING (
    org_id IS NOT NULL 
    AND user_belongs_to_org(auth.uid(), org_id) 
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- ============================================
-- EDU LIVES
-- ============================================
CREATE TABLE public.edu_lives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  url TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  org_id UUID REFERENCES public.orgs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.edu_lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edu lives"
  ON public.edu_lives FOR SELECT
  USING (org_id IS NULL OR user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage edu lives"
  ON public.edu_lives FOR ALL
  USING (
    org_id IS NOT NULL 
    AND user_belongs_to_org(auth.uid(), org_id) 
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- ============================================
-- EDU MODULES (belongs to a course)
-- ============================================
CREATE TABLE public.edu_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  module_index INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_index)
);

ALTER TABLE public.edu_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edu modules"
  ON public.edu_modules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage edu modules"
  ON public.edu_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_courses c
      WHERE c.id = edu_modules.course_id
      AND c.org_id IS NOT NULL
      AND user_belongs_to_org(auth.uid(), c.org_id)
      AND has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

-- ============================================
-- EDU MODULE LIVES (junction: module <-> lives with classification)
-- ============================================
CREATE TABLE public.edu_module_lives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.edu_modules(id) ON DELETE CASCADE,
  live_id UUID NOT NULL REFERENCES public.edu_lives(id) ON DELETE CASCADE,
  live_type public.live_type NOT NULL DEFAULT 'primary',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, live_id)
);

ALTER TABLE public.edu_module_lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edu module lives"
  ON public.edu_module_lives FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage edu module lives"
  ON public.edu_module_lives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_modules m
      JOIN public.edu_courses c ON c.id = m.course_id
      WHERE m.id = edu_module_lives.module_id
      AND c.org_id IS NOT NULL
      AND user_belongs_to_org(auth.uid(), c.org_id)
      AND has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

-- ============================================
-- EDU TRACKS (Trilhas formativas)
-- ============================================
CREATE TABLE public.edu_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  audience public.target_agent DEFAULT 'GESTORES',
  objective TEXT,
  delivery TEXT,
  org_id UUID REFERENCES public.orgs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.edu_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edu tracks"
  ON public.edu_tracks FOR SELECT
  USING (org_id IS NULL OR user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage edu tracks"
  ON public.edu_tracks FOR ALL
  USING (
    org_id IS NOT NULL 
    AND user_belongs_to_org(auth.uid(), org_id) 
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- ============================================
-- EDU TRACK COURSES (junction: track <-> courses with order)
-- ============================================
CREATE TABLE public.edu_track_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.edu_tracks(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(track_id, course_id)
);

ALTER TABLE public.edu_track_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edu track courses"
  ON public.edu_track_courses FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage edu track courses"
  ON public.edu_track_courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_tracks t
      WHERE t.id = edu_track_courses.track_id
      AND t.org_id IS NOT NULL
      AND user_belongs_to_org(auth.uid(), t.org_id)
      AND has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

-- ============================================
-- INDICATOR COURSE MAP (IGMA indicator -> course mapping)
-- ============================================
CREATE TABLE public.indicator_course_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(indicator_id, course_id)
);

ALTER TABLE public.indicator_course_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view indicator course map"
  ON public.indicator_course_map FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage indicator course map"
  ON public.indicator_course_map FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- ============================================
-- INDICATOR LIVE MAP (IGMA indicator -> live mapping)
-- ============================================
CREATE TABLE public.indicator_live_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  live_id UUID NOT NULL REFERENCES public.edu_lives(id) ON DELETE CASCADE,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(indicator_id, live_id)
);

ALTER TABLE public.indicator_live_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view indicator live map"
  ON public.indicator_live_map FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage indicator live map"
  ON public.indicator_live_map FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- ============================================
-- LEARNING RUNS (recommendation sessions)
-- ============================================
CREATE TABLE public.learning_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  territory_id UUID REFERENCES public.destinations(id),
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning runs"
  ON public.learning_runs FOR SELECT
  USING (auth.uid() = user_id OR user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can create learning runs in their org"
  ON public.learning_runs FOR INSERT
  WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage all learning runs"
  ON public.learning_runs FOR ALL
  USING (
    user_belongs_to_org(auth.uid(), org_id) 
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- ============================================
-- LEARNING RECOMMENDATIONS (output of recommendation engine)
-- ============================================
CREATE TABLE public.learning_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.learning_runs(id) ON DELETE CASCADE,
  entity_type public.recommendation_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recommendations for their runs"
  ON public.learning_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_runs r
      WHERE r.id = learning_recommendations.run_id
      AND (auth.uid() = r.user_id OR user_belongs_to_org(auth.uid(), r.org_id))
    )
  );

CREATE POLICY "System can manage recommendations"
  ON public.learning_recommendations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_runs r
      WHERE r.id = learning_recommendations.run_id
      AND user_belongs_to_org(auth.uid(), r.org_id)
    )
  );

-- Create indexes for performance
CREATE INDEX idx_edu_modules_course ON public.edu_modules(course_id);
CREATE INDEX idx_edu_module_lives_module ON public.edu_module_lives(module_id);
CREATE INDEX idx_edu_module_lives_live ON public.edu_module_lives(live_id);
CREATE INDEX idx_edu_track_courses_track ON public.edu_track_courses(track_id);
CREATE INDEX idx_edu_track_courses_course ON public.edu_track_courses(course_id);
CREATE INDEX idx_indicator_course_map_indicator ON public.indicator_course_map(indicator_id);
CREATE INDEX idx_indicator_course_map_course ON public.indicator_course_map(course_id);
CREATE INDEX idx_indicator_live_map_indicator ON public.indicator_live_map(indicator_id);
CREATE INDEX idx_indicator_live_map_live ON public.indicator_live_map(live_id);
CREATE INDEX idx_learning_recommendations_run ON public.learning_recommendations(run_id);