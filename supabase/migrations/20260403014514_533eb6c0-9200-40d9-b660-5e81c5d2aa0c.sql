
-- 1. Add curriculum_level to edu_trainings
ALTER TABLE public.edu_trainings
  ADD COLUMN IF NOT EXISTS curriculum_level integer CHECK (curriculum_level BETWEEN 1 AND 4);

-- 2. Create curriculum_levels reference table
CREATE TABLE public.curriculum_levels (
  level integer PRIMARY KEY,
  name text NOT NULL,
  description text,
  target_audience text,
  ods_alignment text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.curriculum_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read curriculum levels"
  ON public.curriculum_levels FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage curriculum levels"
  ON public.curriculum_levels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- 4. Seed the 4 levels
INSERT INTO public.curriculum_levels (level, name, description, target_audience, ods_alignment) VALUES
  (1, 'Fundamentos', 'Conceitos básicos do turismo sustentável e introdução ao SISTUR. Base obrigatória para todos os operadores do setor.', 'Todos os operadores e profissionais do turismo', ARRAY['4.1', '4.6']),
  (2, 'Técnico Operacional', 'Habilidades técnicas para operação e gestão de serviços turísticos. Foco em execução e qualidade.', 'Técnicos, operadores e prestadores de serviços', ARRAY['4.4', '8.9']),
  (3, 'Gestão Avançada', 'Planejamento estratégico, governança e gestão de destinos turísticos. Tomada de decisão baseada em dados.', 'Gestores públicos e privados do turismo', ARRAY['4.3', '4.4', '11.4']),
  (4, 'Liderança e Inovação', 'Inovação, liderança territorial e políticas públicas de turismo. Visão sistêmica e transformação do setor.', 'Líderes, formuladores de políticas e inovadores', ARRAY['4.3', '4.4', '8.9', '12.b']);
