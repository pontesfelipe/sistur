CREATE TABLE IF NOT EXISTS public.national_reference_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code TEXT NOT NULL,
  reference_year INT NOT NULL,
  value NUMERIC NOT NULL,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (indicator_code, reference_year)
);

ALTER TABLE public.national_reference_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "national_reference_read_all" ON public.national_reference_values;
CREATE POLICY "national_reference_read_all"
ON public.national_reference_values
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "national_reference_admin_write" ON public.national_reference_values;
CREATE POLICY "national_reference_admin_write"
ON public.national_reference_values
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));