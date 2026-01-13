-- ================================================
-- PHASE 3: PUBLIC TRANSPARENCY PORTAL
-- ================================================

-- 1. Public Destination Certifications Table (for tracking)
CREATE TABLE destination_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Certification details
  certification_level TEXT NOT NULL CHECK (certification_level IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),
  certified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Scores at certification time
  territorial_impact_index DECIMAL(5,4) NOT NULL,
  ra_score DECIMAL(5,4) NOT NULL,
  oe_score DECIMAL(5,4) NOT NULL,
  ao_score DECIMAL(5,4) NOT NULL,
  
  -- Badge & marketing
  badge_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Renewal
  previous_certification_id UUID REFERENCES destination_certifications(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for destination_certifications
CREATE INDEX idx_certifications_destination ON destination_certifications(destination_id);
CREATE INDEX idx_certifications_level ON destination_certifications(certification_level);
CREATE INDEX idx_certifications_active ON destination_certifications(is_active);

-- RLS for destination_certifications
ALTER TABLE destination_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage certifications"
  ON destination_certifications FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active certifications"
  ON destination_certifications FOR SELECT
  USING (is_active = TRUE);

-- 2. Public Views (no need for materialized view - can use regular view with indexes)
CREATE VIEW public_destination_summary AS
SELECT
  d.id as destination_id,
  d.name,
  d.uf,
  d.ibge_code,
  d.latitude,
  d.longitude,
  a.id as latest_assessment_id,
  a.calculated_at as latest_assessment_date,
  
  -- Pillar scores (as JSON for easy consumption)
  (
    SELECT jsonb_object_agg(ps.pillar, jsonb_build_object('score', ps.score, 'severity', ps.severity))
    FROM pillar_scores ps
    WHERE ps.assessment_id = a.id
  ) as pillar_scores,
  
  -- Impact scores
  tis.territorial_impact_index,
  tis.certification_level,
  tis.esg_score,
  tis.sdg_alignments,
  tis.environmental_impact,
  tis.social_impact,
  tis.institutional_impact,
  tis.economic_impact,
  tis.certification_eligible,
  
  -- IGMA filtering (ready for visitors if RA & AO not critical)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pillar_scores ps
      WHERE ps.assessment_id = a.id
      AND ps.pillar = 'RA' AND ps.severity = 'CRITICO'
    ) THEN FALSE
    WHEN EXISTS (
      SELECT 1 FROM pillar_scores ps
      WHERE ps.assessment_id = a.id
      AND ps.pillar = 'AO' AND ps.severity = 'CRITICO'
    ) THEN FALSE
    ELSE TRUE
  END as ready_for_visitors,
  
  -- Count of indicators used
  (
    SELECT COUNT(DISTINCT iv.indicator_id)
    FROM indicator_values iv
    WHERE iv.assessment_id = a.id
  ) as indicator_count
  
FROM destinations d
INNER JOIN assessments a ON a.destination_id = d.id AND a.status = 'CALCULATED'
LEFT JOIN territorial_impact_scores tis ON tis.assessment_id = a.id
WHERE a.calculated_at = (
  SELECT MAX(a2.calculated_at)
  FROM assessments a2
  WHERE a2.destination_id = d.id AND a2.status = 'CALCULATED'
);

-- 3. Entrepreneur Profiles Table
CREATE TABLE entrepreneur_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_profile_id UUID NOT NULL REFERENCES stakeholder_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  business_type TEXT NOT NULL CHECK (business_type IN (
    'HOSPITALITY',
    'FOOD_BEVERAGE',
    'TOUR_OPERATOR',
    'TRANSPORT',
    'RETAIL',
    'CULTURAL',
    'ADVENTURE',
    'OTHER'
  )),
  
  business_name TEXT,
  business_description TEXT,
  destinations_of_interest UUID[] DEFAULT '{}',
  
  -- IGMA-aware expansion planning
  expansion_interests JSONB DEFAULT '{}',
  sustainability_commitment TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(stakeholder_profile_id)
);

-- Indexes for entrepreneur_profiles
CREATE INDEX idx_entrepreneur_profiles_user ON entrepreneur_profiles(user_id);
CREATE INDEX idx_entrepreneur_profiles_type ON entrepreneur_profiles(business_type);
CREATE INDEX idx_entrepreneur_profiles_org ON entrepreneur_profiles(org_id);

-- RLS for entrepreneur_profiles
ALTER TABLE entrepreneur_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entrepreneur profile"
  ON entrepreneur_profiles FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Org admins can view org entrepreneur profiles"
  ON entrepreneur_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 4. Traveler Profiles Table
CREATE TABLE traveler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_profile_id UUID NOT NULL REFERENCES stakeholder_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  travel_preferences JSONB DEFAULT '{}',
  sustainability_priorities TEXT[] DEFAULT '{}',
  destinations_visited UUID[] DEFAULT '{}',
  destinations_saved UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(stakeholder_profile_id)
);

-- Indexes for traveler_profiles
CREATE INDEX idx_traveler_profiles_user ON traveler_profiles(user_id);

-- RLS for traveler_profiles
ALTER TABLE traveler_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own traveler profile"
  ON traveler_profiles FOR ALL
  USING (user_id = auth.uid());

-- Triggers
CREATE TRIGGER update_entrepreneur_profiles_updated_at
  BEFORE UPDATE ON entrepreneur_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_traveler_profiles_updated_at
  BEFORE UPDATE ON traveler_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();