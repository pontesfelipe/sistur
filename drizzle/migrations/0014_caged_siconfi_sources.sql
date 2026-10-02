CREATE TABLE public.caged_tourism_employment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code text NOT NULL,
  reference_year int NOT NULL,
  reference_month int NOT NULL,
  sector text NOT NULL,
  saldo_empregos int NOT NULL DEFAULT 0,
  admissoes int NOT NULL DEFAULT 0,
  desligamentos int NOT NULL DEFAULT 0,
  estoque_empregos int,
  source_code text NOT NULL DEFAULT 'CAGED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ibge_code, reference_year, reference_month, sector)
);

GRANT SELECT ON public.caged_tourism_employment TO authenticated;
GRANT ALL ON public.caged_tourism_employment TO service_role;

ALTER TABLE public.caged_tourism_employment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dados oficiais publicos: leitura autenticada"
  ON public.caged_tourism_employment FOR SELECT TO authenticated USING (true);

CREATE TABLE public.siconfi_municipal_spending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code text NOT NULL,
  reference_year int NOT NULL,
  funcao text NOT NULL,
  despesa_realizada numeric NOT NULL DEFAULT 0,
  despesa_empenhada numeric,
  source_code text NOT NULL DEFAULT 'SICONFI',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ibge_code, reference_year, funcao)
);

GRANT SELECT ON public.siconfi_municipal_spending TO authenticated;
GRANT ALL ON public.siconfi_municipal_spending TO service_role;

ALTER TABLE public.siconfi_municipal_spending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dados oficiais publicos: leitura autenticada"
  ON public.siconfi_municipal_spending FOR SELECT TO authenticated USING (true);

INSERT INTO public.external_data_sources (code, name, description, update_frequency, trust_level_default, active)
VALUES
  ('CAGED', 'Novo CAGED — Ministerio do Trabalho e Emprego', 'Empregos formais no setor turistico por municipio (alojamento, alimentacao, transporte, agencias).', 'MENSAL', 5, true),
  ('SICONFI', 'SICONFI/FINBRA — Tesouro Nacional', 'Despesa municipal realizada na funcao Turismo (e Cultura/Saneamento).', 'ANUAL', 5, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  update_frequency = EXCLUDED.update_frequency,
  active = true;