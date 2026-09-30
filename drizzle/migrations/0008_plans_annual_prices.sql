ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS annual_price_cents integer, ADD COLUMN IF NOT EXISTS stripe_price_id_annual text;
UPDATE public.plans SET annual_price_cents = 29500, stripe_price_id_annual = 'estudante_anual' WHERE stripe_price_id = 'estudante_mensal';
UPDATE public.plans SET annual_price_cents = 35700, stripe_price_id_annual = 'professor_anual' WHERE stripe_price_id = 'professor_mensal';
UPDATE public.plans SET annual_price_cents = 60100, stripe_price_id_annual = 'empresarial_anual' WHERE stripe_price_id = 'empresarial_mensal';