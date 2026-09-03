ALTER TABLE public.edu_trainings ADD COLUMN IF NOT EXISTS is_foundation boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS edu_trainings_single_foundation_idx ON public.edu_trainings ((is_foundation)) WHERE is_foundation;

INSERT INTO public.edu_trainings (
  training_id, title, type, pillar, status, active, is_foundation, curriculum_level,
  slug, course_code, level, target_audience, description, objective, ementa, metodologia,
  competencias, habilidades, modules, tags
) VALUES (
  'edu_course_fundamentos_sistur',
  'Fundamentos do SISTUR e da Análise Estrutural do Turismo',
  'course', 'RA', 'published', true, true, 1,
  'fundamentos-sistur', 'SISTUR-000', 'Fundamental',
  'Acadêmicos; Gestores Públicos; Empresários',
  'Curso central e obrigatório da plataforma. Organiza a compreensão do turismo como sistema aberto, apresenta os conjuntos RA, OE e AO e fornece a linguagem comum para todas as demais formações.',
  'Compreender o turismo como sistema; relacionar RA, OE e AO; realizar leitura sistêmica inicial.',
  'Fundamentos da teoria de sistemas e do turismo; dimensão e dinâmica do SISTUR; conjuntos das Relações Ambientais, da Organização Estrutural e das Ações Operacionais; integração sistêmica e diagnóstico aplicado.',
  'Livro Análise Estrutural do Turismo + introduções do Professor Mario Beni + especialistas convidados.',
  '["Compreender o turismo como sistema aberto","Relacionar os conjuntos RA, OE e AO","Realizar leitura sistêmica inicial de um destino"]'::jsonb,
  '["Leitura sistêmica","Diagnóstico aplicado","Interpretação de interdependências"]'::jsonb,
  '[{"order":1,"title":"Fundamentos da teoria de sistemas e do turismo"},{"order":2,"title":"Dimensão e dinâmica do SISTUR"},{"order":3,"title":"Conjunto das Relações Ambientais"},{"order":4,"title":"Conjunto da Organização Estrutural"},{"order":5,"title":"Conjunto das Ações Operacionais"},{"order":6,"title":"Integração sistêmica e diagnóstico aplicado"}]'::jsonb,
  '["SISTUR","Fundamentos","Obrigatório"]'::jsonb
) ON CONFLICT (training_id) DO UPDATE SET is_foundation = true, status = 'published', active = true;