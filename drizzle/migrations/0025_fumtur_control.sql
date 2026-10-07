CREATE TABLE public.fumtur_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  law_reference text,
  fund_cnpj text,
  bank_account text,
  opening_balance numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_id, fiscal_year)
);
CREATE TABLE public.fumtur_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES public.fumtur_funds(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  revenue_date date NOT NULL DEFAULT current_date,
  origin text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.fumtur_application_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES public.fumtur_funds(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  planned_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'proposed',
  approved_meeting text,
  approved_at date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_budget_lines ADD COLUMN IF NOT EXISTS commitment_number text;
ALTER TABLE public.project_budget_lines ADD COLUMN IF NOT EXISTS execution_stage text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fumtur_funds, public.fumtur_revenues, public.fumtur_application_plan TO authenticated;
GRANT ALL ON public.fumtur_funds, public.fumtur_revenues, public.fumtur_application_plan TO service_role;

ALTER TABLE public.fumtur_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fumtur_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fumtur_application_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage fumtur funds" ON public.fumtur_funds FOR ALL TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Org members manage fumtur revenues" ON public.fumtur_revenues FOR ALL TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Org members manage fumtur plan" ON public.fumtur_application_plan FOR ALL TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'));