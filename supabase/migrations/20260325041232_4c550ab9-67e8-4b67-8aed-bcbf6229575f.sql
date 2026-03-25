
-- Track terms acceptance per user
CREATE TABLE public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, terms_version)
);

ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can read their own acceptance
CREATE POLICY "Users can read own terms acceptance"
  ON public.terms_acceptance FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own acceptance
CREATE POLICY "Users can accept terms"
  ON public.terms_acceptance FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read all
CREATE POLICY "Admins can read all terms acceptance"
  ON public.terms_acceptance FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
