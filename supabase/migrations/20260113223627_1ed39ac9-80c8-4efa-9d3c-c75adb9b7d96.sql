-- ================================================
-- PHASE 1: FOUNDATION - Multi-Stakeholder & Impact Mathematics
-- ================================================

-- 1. Stakeholder Profiles Table
CREATE TABLE stakeholder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  stakeholder_type TEXT NOT NULL CHECK (stakeholder_type IN (
    'PUBLIC_DECISION_MAKER',
    'INVESTOR',
    'ENTREPRENEUR',
    'COMMUNITY_MEMBER',
    'TRAVELER'
  )),
  profile_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, stakeholder_type)
);

-- Indexes for stakeholder_profiles
CREATE INDEX idx_stakeholder_profiles_type ON stakeholder_profiles(stakeholder_type);
CREATE INDEX idx_stakeholder_profiles_user ON stakeholder_profiles(user_id);
CREATE INDEX idx_stakeholder_profiles_org ON stakeholder_profiles(org_id);

-- RLS for stakeholder_profiles
ALTER TABLE stakeholder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stakeholder profiles"
  ON stakeholder_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stakeholder profiles"
  ON stakeholder_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stakeholder profiles"
  ON stakeholder_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can view all org stakeholder profiles"
  ON stakeholder_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 2. Territorial Impact Scores Table
CREATE TABLE territorial_impact_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Four impact dimensions (0-1 scale)
  environmental_impact DECIMAL(5,4) NOT NULL CHECK (environmental_impact BETWEEN 0 AND 1),
  social_impact DECIMAL(5,4) NOT NULL CHECK (social_impact BETWEEN 0 AND 1),
  institutional_impact DECIMAL(5,4) NOT NULL CHECK (institutional_impact BETWEEN 0 AND 1),
  economic_impact DECIMAL(5,4) NOT NULL CHECK (economic_impact BETWEEN 0 AND 1),
  
  -- Composite index (weighted average based on Beni hierarchy)
  territorial_impact_index DECIMAL(5,4) NOT NULL CHECK (territorial_impact_index BETWEEN 0 AND 1),
  
  -- Certification (only if all pillars >= 0.67)
  certification_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  certification_level TEXT CHECK (certification_level IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),
  
  -- ESG & SDG alignment
  esg_score DECIMAL(5,2) CHECK (esg_score BETWEEN 0 AND 100),
  sdg_alignments INTEGER[] DEFAULT '{}',
  
  -- Metadata
  calculation_method TEXT DEFAULT 'BENI_WEIGHTED_V1',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(assessment_id)
);

-- Indexes for territorial_impact_scores
CREATE INDEX idx_impact_scores_destination ON territorial_impact_scores(destination_id);
CREATE INDEX idx_impact_scores_certification ON territorial_impact_scores(certification_level);
CREATE INDEX idx_impact_scores_org ON territorial_impact_scores(org_id);

-- RLS for territorial_impact_scores
ALTER TABLE territorial_impact_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view impact scores for their org"
  ON territorial_impact_scores FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view certified destination scores"
  ON territorial_impact_scores FOR SELECT
  USING (certification_eligible = TRUE);

CREATE POLICY "Users can insert impact scores for their org"
  ON territorial_impact_scores FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update impact scores for their org"
  ON territorial_impact_scores FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- 3. Community Feedback Table
CREATE TABLE community_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  community_member_id UUID REFERENCES stakeholder_profiles(id) ON DELETE SET NULL,
  
  -- Feedback scores (1-5 scale)
  quality_of_life_score INTEGER CHECK (quality_of_life_score BETWEEN 1 AND 5),
  tourism_impact_perception TEXT CHECK (tourism_impact_perception IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  environmental_concern_level INTEGER CHECK (environmental_concern_level BETWEEN 1 AND 5),
  cultural_preservation_score INTEGER CHECK (cultural_preservation_score BETWEEN 1 AND 5),
  
  -- Open feedback
  concerns TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  priorities TEXT[] DEFAULT '{}',
  
  -- Demographics (anonymized)
  neighborhood TEXT,
  age_group TEXT,
  occupation_sector TEXT,
  
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for community_feedback
CREATE INDEX idx_community_feedback_destination ON community_feedback(destination_id);
CREATE INDEX idx_community_feedback_assessment ON community_feedback(assessment_id);
CREATE INDEX idx_community_feedback_org ON community_feedback(org_id);

-- RLS for community_feedback
ALTER TABLE community_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community members can submit feedback"
  ON community_feedback FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can view community feedback"
  ON community_feedback FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at on stakeholder_profiles
CREATE TRIGGER update_stakeholder_profiles_updated_at
  BEFORE UPDATE ON stakeholder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();