-- License types: trial, basic, pro, enterprise
-- Trial: 7 days from creation, auto-expires
-- Paid plans: validated by admin or payment integration

CREATE TYPE license_plan AS ENUM ('trial', 'basic', 'pro', 'enterprise');
CREATE TYPE license_status AS ENUM ('active', 'expired', 'cancelled', 'suspended');

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  plan license_plan NOT NULL DEFAULT 'trial',
  status license_status NOT NULL DEFAULT 'active',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  max_users INT DEFAULT 1,
  features JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_org_id ON licenses(org_id);
CREATE INDEX idx_licenses_status ON licenses(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_license_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_license_updated
  BEFORE UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_license_timestamp();

-- RLS policies
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Users can read their own license
CREATE POLICY "Users can view own license"
  ON licenses FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all licenses
CREATE POLICY "Admins can manage licenses"
  ON licenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'ADMIN'
    )
  );

-- Function: automatically create a trial license on user signup
CREATE OR REPLACE FUNCTION create_trial_license()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO licenses (user_id, plan, status, trial_started_at, trial_ends_at, features)
  VALUES (
    NEW.user_id,
    'trial',
    'active',
    now(),
    now() + INTERVAL '7 days',
    '{"erp": true, "edu": true, "games": true, "reports": false, "integrations": false}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create trial on profile creation (which happens after signup)
CREATE TRIGGER trigger_create_trial_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_license();

-- Function: check and expire trials
CREATE OR REPLACE FUNCTION expire_trial_licenses()
RETURNS void AS $$
BEGIN
  UPDATE licenses
  SET status = 'expired'
  WHERE plan = 'trial'
    AND status = 'active'
    AND trial_ends_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: admin can upgrade a user's license
CREATE OR REPLACE FUNCTION upgrade_license(
  _user_id UUID,
  _plan license_plan,
  _expires_at TIMESTAMPTZ DEFAULT NULL,
  _max_users INT DEFAULT 1,
  _features JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  UPDATE licenses
  SET plan = _plan,
      status = 'active',
      expires_at = _expires_at,
      max_users = _max_users,
      features = _features,
      activated_at = now(),
      created_by = auth.uid()
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO licenses (user_id, plan, status, expires_at, max_users, features, created_by)
    VALUES (_user_id, _plan, 'active', _expires_at, _max_users, _features, auth.uid());
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
