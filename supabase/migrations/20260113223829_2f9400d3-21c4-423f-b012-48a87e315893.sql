-- ================================================
-- PHASE 2: INVESTMENT MARKETPLACE
-- ================================================

-- 1. Investment Opportunities Table
CREATE TABLE investment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Opportunity details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  investment_type TEXT NOT NULL CHECK (investment_type IN (
    'ENVIRONMENTAL_RESTORATION',
    'GOVERNANCE_CAPACITY',
    'INFRASTRUCTURE_DEVELOPMENT',
    'TRAINING_CAPACITY',
    'RESEARCH_DEVELOPMENT'
  )),
  required_capital BIGINT NOT NULL CHECK (required_capital > 0),
  expected_roi DECIMAL(5,2),
  impact_focus TEXT[] DEFAULT '{}',
  
  -- IGMA compliance
  igma_approved BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_by_igma BOOLEAN NOT NULL DEFAULT FALSE,
  blocking_reason TEXT,
  
  -- Impact projections (0-1 scale)
  projected_ra_improvement DECIMAL(5,4),
  projected_ao_improvement DECIMAL(5,4),
  projected_oe_improvement DECIMAL(5,4),
  
  -- Due diligence
  data_package_url TEXT,
  risk_assessment JSONB DEFAULT '{}',
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'PUBLISHED', 'FUNDED', 'COMPLETED'
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for investment_opportunities
CREATE INDEX idx_investment_opportunities_destination ON investment_opportunities(destination_id);
CREATE INDEX idx_investment_opportunities_type ON investment_opportunities(investment_type);
CREATE INDEX idx_investment_opportunities_igma ON investment_opportunities(igma_approved, status);
CREATE INDEX idx_investment_opportunities_org ON investment_opportunities(org_id);
CREATE INDEX idx_investment_opportunities_status ON investment_opportunities(status);

-- RLS for investment_opportunities
ALTER TABLE investment_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage their investment opportunities"
  ON investment_opportunities FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Investors can view IGMA-approved published opportunities"
  ON investment_opportunities FOR SELECT
  USING (
    status = 'PUBLISHED' AND
    igma_approved = TRUE AND
    auth.uid() IN (
      SELECT user_id FROM stakeholder_profiles
      WHERE stakeholder_type = 'INVESTOR'
    )
  );

-- 2. Investor Profiles Table (extends stakeholder_profiles)
CREATE TABLE investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_profile_id UUID NOT NULL REFERENCES stakeholder_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  investor_type TEXT NOT NULL CHECK (investor_type IN (
    'IMPACT_FUND',
    'PRIVATE_EQUITY',
    'REAL_ESTATE',
    'GOVERNMENT',
    'MULTILATERAL',
    'ANGEL'
  )),
  
  investment_thesis JSONB DEFAULT '{}',
  impact_focus TEXT[] DEFAULT '{}',
  geographic_scope TEXT[] DEFAULT '{}',
  ticket_size_min BIGINT,
  ticket_size_max BIGINT,
  
  -- Contact preferences
  contact_email TEXT,
  contact_phone TEXT,
  preferred_contact_method TEXT DEFAULT 'email',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(stakeholder_profile_id)
);

-- Indexes for investor_profiles
CREATE INDEX idx_investor_profiles_user ON investor_profiles(user_id);
CREATE INDEX idx_investor_profiles_type ON investor_profiles(investor_type);
CREATE INDEX idx_investor_profiles_org ON investor_profiles(org_id);

-- RLS for investor_profiles
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own investor profile"
  ON investor_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own investor profile"
  ON investor_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own investor profile"
  ON investor_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Org admins can view org investor profiles"
  ON investor_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 3. Investment Interests (investor-opportunity matching)
CREATE TABLE investment_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_profile_id UUID NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  interest_level TEXT NOT NULL CHECK (interest_level IN ('WATCHING', 'INTERESTED', 'COMMITTED')),
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(investor_profile_id, opportunity_id)
);

-- Indexes for investment_interests
CREATE INDEX idx_investment_interests_investor ON investment_interests(investor_profile_id);
CREATE INDEX idx_investment_interests_opportunity ON investment_interests(opportunity_id);
CREATE INDEX idx_investment_interests_user ON investment_interests(user_id);

-- RLS for investment_interests
ALTER TABLE investment_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own interests"
  ON investment_interests FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Opportunity owners can view interests"
  ON investment_interests FOR SELECT
  USING (
    opportunity_id IN (
      SELECT id FROM investment_opportunities
      WHERE org_id IN (
        SELECT org_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_investment_opportunities_updated_at
  BEFORE UPDATE ON investment_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investor_profiles_updated_at
  BEFORE UPDATE ON investor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investment_interests_updated_at
  BEFORE UPDATE ON investment_interests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();