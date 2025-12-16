-- SISTUR MVP Database Schema

-- =============================================
-- 1. ENUMS
-- =============================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');

-- Assessment status enum
CREATE TYPE public.assessment_status AS ENUM ('DRAFT', 'DATA_READY', 'CALCULATED');

-- Pillar enum
CREATE TYPE public.pillar_type AS ENUM ('RA', 'OE', 'AO');

-- Severity enum
CREATE TYPE public.severity_type AS ENUM ('CRITICO', 'MODERADO', 'BOM');

-- Course level enum
CREATE TYPE public.course_level AS ENUM ('BASICO', 'INTERMEDIARIO', 'AVANCADO');

-- Indicator direction enum
CREATE TYPE public.indicator_direction AS ENUM ('HIGH_IS_BETTER', 'LOW_IS_BETTER');

-- Normalization type enum
CREATE TYPE public.normalization_type AS ENUM ('MIN_MAX', 'BANDS', 'BINARY');

-- =============================================
-- 2. ORGANIZATIONS (Tenants)
-- =============================================

CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. PROFILES
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. USER ROLES (Separate table for security)
-- =============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'VIEWER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user has a specific role in their org
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user belongs to an org
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- =============================================
-- 6. DESTINATIONS
-- =============================================

CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  uf TEXT,
  ibge_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. ASSESSMENTS
-- =============================================

CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  status assessment_status NOT NULL DEFAULT 'DRAFT',
  algo_version TEXT NOT NULL DEFAULT 'v1',
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. INDICATORS (Catalog - global or per-org)
-- =============================================

CREATE TABLE public.indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE, -- NULL = global
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  pillar pillar_type NOT NULL,
  theme TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  direction indicator_direction NOT NULL DEFAULT 'HIGH_IS_BETTER',
  normalization normalization_type NOT NULL DEFAULT 'MIN_MAX',
  min_ref DOUBLE PRECISION,
  max_ref DOUBLE PRECISION,
  weight DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. INDICATOR VALUES (Raw data per assessment)
-- =============================================

CREATE TABLE public.indicator_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  value_raw DOUBLE PRECISION,
  value_text TEXT,
  source TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, indicator_id)
);

ALTER TABLE public.indicator_values ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. INDICATOR SCORES (Normalized scores)
-- =============================================

CREATE TABLE public.indicator_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL CHECK (score >= 0 AND score <= 1),
  min_ref_used DOUBLE PRECISION,
  max_ref_used DOUBLE PRECISION,
  weight_used DOUBLE PRECISION,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, indicator_id)
);

ALTER TABLE public.indicator_scores ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. PILLAR SCORES (IRA/IOE/IAO)
-- =============================================

CREATE TABLE public.pillar_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar pillar_type NOT NULL,
  score DOUBLE PRECISION NOT NULL CHECK (score >= 0 AND score <= 1),
  severity severity_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, pillar)
);

ALTER TABLE public.pillar_scores ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 12. ISSUES (Bottlenecks detected)
-- =============================================

CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar pillar_type NOT NULL,
  theme TEXT NOT NULL,
  severity severity_type NOT NULL,
  title TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 13. COURSES (EDU Catalog)
-- =============================================

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE, -- NULL = global
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  duration_minutes INTEGER,
  level course_level NOT NULL DEFAULT 'BASICO',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 14. RECOMMENDATIONS
-- =============================================

CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 15. AUDIT EVENTS
-- =============================================

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 16. RLS POLICIES - ORGS
-- =============================================

CREATE POLICY "Users can view their own org"
  ON public.orgs FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), id));

CREATE POLICY "Admins can update their org"
  ON public.orgs FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), id) AND public.has_role(auth.uid(), 'ADMIN'));

-- =============================================
-- 17. RLS POLICIES - PROFILES
-- =============================================

CREATE POLICY "Users can view profiles in their org"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 18. RLS POLICIES - USER ROLES
-- =============================================

CREATE POLICY "Users can view roles in their org"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage roles in their org"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND public.has_role(auth.uid(), 'ADMIN'));

-- =============================================
-- 19. RLS POLICIES - DESTINATIONS
-- =============================================

CREATE POLICY "Users can view destinations in their org"
  ON public.destinations FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins/Analysts can manage destinations"
  ON public.destinations FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ANALYST')));

-- =============================================
-- 20. RLS POLICIES - ASSESSMENTS
-- =============================================

CREATE POLICY "Users can view assessments in their org"
  ON public.assessments FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins/Analysts can manage assessments"
  ON public.assessments FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ANALYST')));

-- =============================================
-- 21. RLS POLICIES - INDICATORS
-- =============================================

CREATE POLICY "Users can view global and org indicators"
  ON public.indicators FOR SELECT
  TO authenticated
  USING (org_id IS NULL OR public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage org indicators"
  ON public.indicators FOR ALL
  TO authenticated
  USING (org_id IS NOT NULL AND public.user_belongs_to_org(auth.uid(), org_id) AND public.has_role(auth.uid(), 'ADMIN'));

-- =============================================
-- 22. RLS POLICIES - INDICATOR VALUES
-- =============================================

CREATE POLICY "Users can view indicator values in their org"
  ON public.indicator_values FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins/Analysts can manage indicator values"
  ON public.indicator_values FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ANALYST')));

-- =============================================
-- 23. RLS POLICIES - INDICATOR SCORES
-- =============================================

CREATE POLICY "Users can view indicator scores in their org"
  ON public.indicator_scores FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "System can manage indicator scores"
  ON public.indicator_scores FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ANALYST')));

-- =============================================
-- 24. RLS POLICIES - PILLAR SCORES
-- =============================================

CREATE POLICY "Users can view pillar scores in their org"
  ON public.pillar_scores FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "System can manage pillar scores"
  ON public.pillar_scores FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ANALYST')));

-- =============================================
-- 25. RLS POLICIES - ISSUES
-- =============================================

CREATE POLICY "Users can view issues in their org"
  ON public.issues FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "System can manage issues"
  ON public.issues FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ANALYST')));

-- =============================================
-- 26. RLS POLICIES - COURSES
-- =============================================

CREATE POLICY "Users can view global and org courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (org_id IS NULL OR public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage org courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (org_id IS NOT NULL AND public.user_belongs_to_org(auth.uid(), org_id) AND public.has_role(auth.uid(), 'ADMIN'));

-- =============================================
-- 27. RLS POLICIES - RECOMMENDATIONS
-- =============================================

CREATE POLICY "Users can view recommendations in their org"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "System can manage recommendations"
  ON public.recommendations FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ANALYST')));

-- =============================================
-- 28. RLS POLICIES - AUDIT EVENTS
-- =============================================

CREATE POLICY "Admins can view audit events in their org"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "System can insert audit events"
  ON public.audit_events FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));

-- =============================================
-- 29. TRIGGERS
-- =============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Create a new organization for the user
  INSERT INTO public.orgs (name)
  VALUES (user_full_name || '''s Organization')
  RETURNING id INTO new_org_id;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, org_id, full_name)
  VALUES (NEW.id, new_org_id, user_full_name);
  
  -- Assign ADMIN role (first user is admin of their org)
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'ADMIN');
  
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 30. INDEXES
-- =============================================

CREATE INDEX idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON public.user_roles(org_id);
CREATE INDEX idx_destinations_org_id ON public.destinations(org_id);
CREATE INDEX idx_assessments_org_id ON public.assessments(org_id);
CREATE INDEX idx_assessments_destination_id ON public.assessments(destination_id);
CREATE INDEX idx_indicator_values_assessment_id ON public.indicator_values(assessment_id);
CREATE INDEX idx_indicator_scores_assessment_id ON public.indicator_scores(assessment_id);
CREATE INDEX idx_pillar_scores_assessment_id ON public.pillar_scores(assessment_id);
CREATE INDEX idx_issues_assessment_id ON public.issues(assessment_id);
CREATE INDEX idx_recommendations_assessment_id ON public.recommendations(assessment_id);
CREATE INDEX idx_audit_events_org_id ON public.audit_events(org_id);