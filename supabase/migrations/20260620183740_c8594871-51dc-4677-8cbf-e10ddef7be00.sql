
CREATE TABLE IF NOT EXISTS public.beni_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  persona TEXT,
  output_format TEXT,
  base_theory TEXT,
  dynamic_context TEXT,
  scope_guardrails TEXT,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.beni_settings TO authenticated;
GRANT ALL ON public.beni_settings TO service_role;

ALTER TABLE public.beni_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read beni settings"
  ON public.beni_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert beni settings"
  ON public.beni_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can update beni settings"
  ON public.beni_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE TRIGGER beni_settings_updated_at
  BEFORE UPDATE ON public.beni_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.beni_settings (id) VALUES (TRUE) ON CONFLICT DO NOTHING;
