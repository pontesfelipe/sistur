
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_id text;

UPDATE public.plans SET stripe_price_id = 'estudante_mensal' WHERE code = 'estudante';
UPDATE public.plans SET stripe_price_id = 'independente_mensal' WHERE code = 'independente';
UPDATE public.plans SET stripe_price_id = 'empresarial_mensal' WHERE code = 'empresarial';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key
  ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE,
  event_type text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  user_id uuid,
  price_id text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_events_admin_read ON public.payment_events;
CREATE POLICY payment_events_admin_read ON public.payment_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
