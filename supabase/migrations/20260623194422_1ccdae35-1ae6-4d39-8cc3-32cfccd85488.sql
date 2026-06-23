-- 1. Add unit_id to result tables
ALTER TABLE public.indicator_scores
  ADD COLUMN IF NOT EXISTS unit_id uuid NULL REFERENCES public.assessment_units(id) ON DELETE CASCADE;
ALTER TABLE public.pillar_scores
  ADD COLUMN IF NOT EXISTS unit_id uuid NULL REFERENCES public.assessment_units(id) ON DELETE CASCADE;
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS unit_id uuid NULL REFERENCES public.assessment_units(id) ON DELETE CASCADE;
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS unit_id uuid NULL REFERENCES public.assessment_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_indicator_scores_assessment_unit ON public.indicator_scores(assessment_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_pillar_scores_assessment_unit ON public.pillar_scores(assessment_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_issues_assessment_unit ON public.issues(assessment_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_assessment_unit ON public.recommendations(assessment_id, unit_id);

-- 2. Convert legacy unique constraints to partial (WHERE unit_id IS NULL) + add multi-unit partial
DO $$
DECLARE
  r RECORD;
BEGIN
  -- indicator_scores: drop any existing unique on (assessment_id, indicator_id)
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.indicator_scores'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.indicator_scores DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
  -- pillar_scores: drop any existing unique on (assessment_id, pillar)
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.pillar_scores'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.pillar_scores DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Drop any existing legacy unique indexes too
DROP INDEX IF EXISTS public.indicator_scores_assessment_id_indicator_id_key;
DROP INDEX IF EXISTS public.pillar_scores_assessment_id_pillar_key;
DROP INDEX IF EXISTS public.uniq_indicator_scores_assessment_indicator;
DROP INDEX IF EXISTS public.uniq_pillar_scores_assessment_pillar;

-- Recreate as partial unique indexes (legacy single-unit) + multi-unit partial
CREATE UNIQUE INDEX IF NOT EXISTS uniq_indicator_scores_legacy
  ON public.indicator_scores(assessment_id, indicator_id)
  WHERE unit_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_indicator_scores_multi
  ON public.indicator_scores(assessment_id, indicator_id, unit_id)
  WHERE unit_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pillar_scores_legacy
  ON public.pillar_scores(assessment_id, pillar)
  WHERE unit_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pillar_scores_multi
  ON public.pillar_scores(assessment_id, pillar, unit_id)
  WHERE unit_id IS NOT NULL;

-- 3. Brand rollups table
CREATE TABLE IF NOT EXISTS public.assessment_brand_rollups (
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  brand_id uuid NULL REFERENCES public.enterprise_brands(id) ON DELETE SET NULL,
  pillar text NOT NULL CHECK (pillar IN ('RA','OE','AO','GLOBAL')),
  score_weighted numeric NOT NULL,
  score_simple numeric NOT NULL,
  stddev numeric NOT NULL DEFAULT 0,
  unit_count integer NOT NULL DEFAULT 0,
  critical_unit_id uuid NULL REFERENCES public.assessment_units(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_id, pillar)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_brand_rollups TO authenticated;
GRANT ALL ON public.assessment_brand_rollups TO service_role;

ALTER TABLE public.assessment_brand_rollups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand rollups readable by org members"
  ON public.assessment_brand_rollups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_brand_rollups.assessment_id
        AND (
          public.user_belongs_to_org(auth.uid(), a.org_id)
          OR public.has_role(auth.uid(), 'ADMIN'::app_role)
        )
    )
  );

CREATE POLICY "Brand rollups writable by org members"
  ON public.assessment_brand_rollups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_brand_rollups.assessment_id
        AND (
          public.user_belongs_to_org(auth.uid(), a.org_id)
          OR public.has_role(auth.uid(), 'ADMIN'::app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_brand_rollups.assessment_id
        AND (
          public.user_belongs_to_org(auth.uid(), a.org_id)
          OR public.has_role(auth.uid(), 'ADMIN'::app_role)
        )
    )
  );

CREATE TRIGGER trg_brand_rollups_updated_at
  BEFORE UPDATE ON public.assessment_brand_rollups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();