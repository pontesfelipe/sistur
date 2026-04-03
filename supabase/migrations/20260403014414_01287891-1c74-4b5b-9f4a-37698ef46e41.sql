
-- 1. Add ODS/PNT columns to indicators
ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS ods_codes text[],
  ADD COLUMN IF NOT EXISTS pnt_axis integer,
  ADD COLUMN IF NOT EXISTS pnt_program text;

-- 2. Add territorial classification columns to destinations
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS municipality_type text CHECK (municipality_type IN ('TURISTICO', 'COMPLEMENTAR', 'APOIO')),
  ADD COLUMN IF NOT EXISTS tourism_region text,
  ADD COLUMN IF NOT EXISTS has_pdt boolean DEFAULT false;

-- 3. Create ods_targets reference table
CREATE TABLE public.ods_targets (
  code text PRIMARY KEY,
  ods_number integer NOT NULL,
  title text NOT NULL,
  description text,
  relevance_for_tourism text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on ods_targets (public read, admin write)
ALTER TABLE public.ods_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ODS targets"
  ON public.ods_targets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage ODS targets"
  ON public.ods_targets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- 5. Seed tourism-critical ODS targets
INSERT INTO public.ods_targets (code, ods_number, title, description, relevance_for_tourism) VALUES
  ('8.9', 8, 'Turismo sustentável', 'Até 2030, elaborar e implementar políticas para promover o turismo sustentável, que gera empregos e promove a cultura e os produtos locais.', 'Meta central do turismo sustentável — diretamente vinculada aos pilares OE e AO do SISTUR.'),
  ('12.b', 12, 'Monitoramento do turismo sustentável', 'Desenvolver e implementar ferramentas para monitorar os impactos do desenvolvimento sustentável para o turismo sustentável.', 'Fundamenta o sistema de indicadores e diagnósticos do SISTUR.'),
  ('14.7', 14, 'Benefícios econômicos do uso sustentável de recursos marinhos', 'Até 2030, aumentar os benefícios econômicos para os SIDS e os LDCs a partir do uso sustentável dos recursos marinhos, inclusive por meio da gestão sustentável da pesca, aquicultura e turismo.', 'Relevante para destinos litorâneos e indicadores do pilar RA.'),
  ('11.4', 11, 'Patrimônio cultural e natural', 'Fortalecer esforços para proteger e salvaguardar o patrimônio cultural e natural do mundo.', 'Conecta-se aos indicadores de preservação cultural e ambiental do pilar RA.'),
  ('4.3', 4, 'Acesso à educação técnica e superior', 'Até 2030, assegurar a igualdade de acesso para todos os homens e mulheres à educação técnica, profissional e superior de qualidade.', 'Vinculada ao módulo EDU do SISTUR e capacitação de agentes turísticos.'),
  ('4.4', 4, 'Habilidades para emprego', 'Até 2030, aumentar substancialmente o número de jovens e adultos que tenham habilidades relevantes, inclusive competências técnicas e profissionais, para emprego, trabalho decente e empreendedorismo.', 'Suporta a formação de profissionais do trade turístico via trilhas educacionais.');
