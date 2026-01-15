-- ==========================================
-- SISTUR EDU LMS - SPRINT 1: COURSES & TRACKS
-- Schema 2: Courses, Modules, Lessons, Tracks
-- ==========================================

-- Course status type
CREATE TYPE public.course_status_type AS ENUM ('draft', 'published', 'archived');

-- ==========================================
-- LMS COURSES (Versioned)
-- ==========================================

CREATE TABLE public.lms_courses (
  course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  primary_pillar TEXT NOT NULL CHECK (primary_pillar IN ('RA', 'OE', 'AO')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  version INTEGER NOT NULL DEFAULT 1,
  status course_status_type NOT NULL DEFAULT 'draft',
  workload_minutes INTEGER,
  prerequisite_text TEXT,
  learning_objectives TEXT[],
  created_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, version)
);

CREATE INDEX idx_lms_courses_pillar ON public.lms_courses(primary_pillar);
CREATE INDEX idx_lms_courses_level ON public.lms_courses(level);
CREATE INDEX idx_lms_courses_status ON public.lms_courses(status);
CREATE INDEX idx_lms_courses_org ON public.lms_courses(org_id);

-- ==========================================
-- COURSE → CONTENT SOURCES (Audit Trail)
-- ==========================================

CREATE TABLE public.course_content_sources (
  course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  content_id TEXT REFERENCES public.content_items(content_id) ON DELETE RESTRICT,
  usage_type TEXT CHECK (usage_type IN ('primary', 'supplementary', 'reference')),
  PRIMARY KEY (course_id, content_id)
);

-- ==========================================
-- MODULES
-- ==========================================

CREATE TABLE public.lms_modules (
  module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lms_modules_course ON public.lms_modules(course_id);
CREATE INDEX idx_lms_modules_order ON public.lms_modules(course_id, order_index);

-- ==========================================
-- LESSONS
-- ==========================================

CREATE TYPE public.lesson_type AS ENUM ('video', 'text', 'interactive', 'quiz');

CREATE TABLE public.lms_lessons (
  lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.lms_modules(module_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  lesson_type lesson_type NOT NULL,
  estimated_minutes INTEGER,
  video_url TEXT,
  content_text TEXT,
  slides_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lms_lessons_module ON public.lms_lessons(module_id);
CREATE INDEX idx_lms_lessons_order ON public.lms_lessons(module_id, order_index);

-- ==========================================
-- LESSON → CONTENT SOURCES (Strong Audit)
-- ==========================================

CREATE TABLE public.lesson_content_sources (
  lesson_id UUID REFERENCES public.lms_lessons(lesson_id) ON DELETE CASCADE,
  content_id TEXT REFERENCES public.content_items(content_id) ON DELETE RESTRICT,
  source_locator TEXT NOT NULL,
  citation_text TEXT,
  PRIMARY KEY (lesson_id, content_id, source_locator)
);

-- ==========================================
-- TRACKS (Learning Paths)
-- ==========================================

CREATE TYPE public.pillar_scope_type AS ENUM ('RA', 'OE', 'AO', 'INTEGRATED');
CREATE TYPE public.track_status_type AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.lms_tracks (
  track_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pillar_scope pillar_scope_type NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  status track_status_type NOT NULL DEFAULT 'published',
  total_workload_minutes INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lms_tracks_pillar ON public.lms_tracks(pillar_scope);
CREATE INDEX idx_lms_tracks_level ON public.lms_tracks(level);
CREATE INDEX idx_lms_tracks_org ON public.lms_tracks(org_id);

-- ==========================================
-- TRACK → COURSES (N:N with order)
-- ==========================================

CREATE TABLE public.lms_track_courses (
  track_id UUID REFERENCES public.lms_tracks(track_id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  PRIMARY KEY (track_id, course_id)
);

CREATE INDEX idx_lms_track_courses_track ON public.lms_track_courses(track_id, order_index);

-- ==========================================
-- COURSE PREREQUISITES
-- ==========================================

CREATE TABLE public.course_prerequisites (
  course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  required_course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, required_course_id),
  CHECK (course_id != required_course_id)
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_track_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Courses - published viewable by all authenticated
CREATE POLICY "Anyone can view published courses"
  ON public.lms_courses FOR SELECT
  USING (status = 'published' OR (org_id IS NOT NULL AND user_belongs_to_org(auth.uid(), org_id)));

CREATE POLICY "Admins can manage courses"
  ON public.lms_courses FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Modules - viewable if course is viewable
CREATE POLICY "Anyone can view modules of published courses"
  ON public.lms_modules FOR SELECT
  USING (
    course_id IN (SELECT course_id FROM public.lms_courses WHERE status = 'published')
    OR (course_id IN (SELECT course_id FROM public.lms_courses c WHERE c.org_id IS NOT NULL AND user_belongs_to_org(auth.uid(), c.org_id)))
  );

CREATE POLICY "Admins can manage modules"
  ON public.lms_modules FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Lessons
CREATE POLICY "Anyone can view lessons of published courses"
  ON public.lms_lessons FOR SELECT
  USING (
    module_id IN (
      SELECT m.module_id FROM public.lms_modules m
      JOIN public.lms_courses c ON c.course_id = m.course_id
      WHERE c.status = 'published'
    )
  );

CREATE POLICY "Admins can manage lessons"
  ON public.lms_lessons FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Tracks
CREATE POLICY "Anyone can view published tracks"
  ON public.lms_tracks FOR SELECT
  USING (status = 'published' OR (org_id IS NOT NULL AND user_belongs_to_org(auth.uid(), org_id)));

CREATE POLICY "Admins can manage tracks"
  ON public.lms_tracks FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Track Courses
CREATE POLICY "Anyone can view track courses"
  ON public.lms_track_courses FOR SELECT
  USING (
    track_id IN (SELECT track_id FROM public.lms_tracks WHERE status = 'published')
  );

CREATE POLICY "Admins can manage track courses"
  ON public.lms_track_courses FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Content Sources - viewable with courses/lessons
CREATE POLICY "Anyone can view course content sources"
  ON public.course_content_sources FOR SELECT
  USING (course_id IN (SELECT course_id FROM public.lms_courses WHERE status = 'published'));

CREATE POLICY "Admins can manage course content sources"
  ON public.course_content_sources FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Anyone can view lesson content sources"
  ON public.lesson_content_sources FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage lesson content sources"
  ON public.lesson_content_sources FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Prerequisites
CREATE POLICY "Anyone can view course prerequisites"
  ON public.course_prerequisites FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage course prerequisites"
  ON public.course_prerequisites FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));