-- ===========================================
-- SISTUR EDU: TRILHAS PADRONIZADAS - Part 1
-- 5 Main Tracks
-- ===========================================

-- 1. Create the 5 main tracks
INSERT INTO public.edu_tracks (id, name, description, objective, audience, delivery, status, active)
VALUES
  ('e1000000-0001-0001-0001-000000000001', 'Trilha 1 — Fundamentos do SISTUR', 
   'Introdução aos conceitos fundamentais do Sistema de Turismo (SISTUR), abordando a análise estrutural do turismo e suas bases teóricas.',
   'Compreender os fundamentos do SISTUR e desenvolver visão sistêmica do turismo.',
   'GESTORES', 'online', 'published', true),
  
  ('e1000000-0001-0001-0001-000000000002', 'Trilha 2 — Governança, Planejamento e Gestão', 
   'Capacitação em governança turística, planejamento territorial, políticas públicas e gestão de destinos com foco na regionalização.',
   'Desenvolver competências em governança, planejamento e gestão estratégica do turismo.',
   'GESTORES', 'online', 'published', true),
  
  ('e1000000-0001-0001-0001-000000000003', 'Trilha 3 — Mercado, Operações e Experiência', 
   'Formação em operações turísticas, marketing de destinos, gestão hoteleira, eventos e experiências sensoriais.',
   'Dominar as operações do mercado turístico e criar experiências memoráveis.',
   'TRADE', 'online', 'published', true),
  
  ('e1000000-0001-0001-0001-000000000004', 'Trilha 4 — Relações Ambientais, Sustentabilidade e Sociedade', 
   'Aprofundamento nas relações ambientais do turismo, sustentabilidade, turismo regenerativo e impactos socioculturais.',
   'Integrar sustentabilidade e responsabilidade socioambiental na gestão turística.',
   'GESTORES', 'online', 'published', true),
  
  ('e1000000-0001-0001-0001-000000000005', 'Trilha 5 — Inovação, Tecnologia e Futuro do Turismo', 
   'Exploração de tendências, inovação, destinos turísticos inteligentes e transformação digital no setor.',
   'Preparar profissionais para o futuro tecnológico e inovador do turismo.',
   'TECNICOS', 'online', 'published', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  objective = EXCLUDED.objective,
  audience = EXCLUDED.audience,
  delivery = EXCLUDED.delivery,
  status = EXCLUDED.status,
  active = EXCLUDED.active;