-- Fase 5: leads comerciais capturados na página pública de preços
CREATE TABLE IF NOT EXISTS public.comercial_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  organization text,
  interested_plan text,
  audience text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','discarded')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Captura pública (formulário sem login): INSERT para anon/authenticated
GRANT INSERT ON public.comercial_leads TO anon;
GRANT INSERT, SELECT ON public.comercial_leads TO authenticated;
GRANT ALL ON public.comercial_leads TO service_role;

ALTER TABLE public.comercial_leads ENABLE ROW LEVEL SECURITY;

-- Leitura/gestão restrita a ADMIN (plataforma)
CREATE POLICY comercial_leads_admin_read ON public.comercial_leads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY comercial_leads_admin_update ON public.comercial_leads
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- INSERT público: qualquer visitante pode enviar o formulário, sem ler nada
CREATE POLICY comercial_leads_public_insert ON public.comercial_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_comercial_leads_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_comercial_leads_updated ON public.comercial_leads;
CREATE TRIGGER trg_comercial_leads_updated
  BEFORE UPDATE ON public.comercial_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_comercial_leads_updated_at();