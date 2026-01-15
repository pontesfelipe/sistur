-- ===========================================
-- SISTUR EDU: TREINAMENTOS - Trilha 1 (Fundamentos)
-- ===========================================

INSERT INTO public.edu_trainings (training_id, title, type, pillar, level, target_audience, objective, video_url, video_provider, active, status)
VALUES
  ('t1-fund-001', 'Aula para a Pós-Graduação - SISTUR', 'live', 'OE', 'Básico', 'Profissionais do turismo, gestores e estudantes', 'Fundamentos do SISTUR e Análise Estrutural do Turismo', 'https://www.youtube.com/live/PW3c5rAyX7Y', 'youtube', true, 'published'),
  ('t1-fund-002', 'Sistur - Conjunto das Organizações Estruturais - OE - Superestrutura - parte 1', 'live', 'OE', 'Básico', 'Profissionais do turismo, gestores e estudantes', 'Fundamentos do SISTUR e Análise Estrutural do Turismo', 'https://youtu.be/4IXUgSR56E8', 'youtube', true, 'published'),
  ('t1-fund-003', 'Sistur - Conjunto das Relações Ambientais - Cultural', 'live', 'RA', 'Básico', 'Profissionais do turismo, gestores e estudantes', 'Fundamentos do SISTUR e Análise Estrutural do Turismo', 'https://youtu.be/oFxQv36b880', 'youtube', true, 'published'),
  ('t1-fund-004', 'Sistur - Introdução', 'live', 'OE', 'Básico', 'Profissionais do turismo, gestores e estudantes', 'Fundamentos do SISTUR e Análise Estrutural do Turismo', 'https://www.youtube.com/live/FtM87RPUcD8', 'youtube', true, 'published'),
  ('t1-fund-005', 'Sistur - Sistema de Turismo - parte 3', 'live', 'OE', 'Básico', 'Profissionais do turismo, gestores e estudantes', 'Fundamentos do SISTUR e Análise Estrutural do Turismo', 'https://www.youtube.com/live/iGWQvj7KDDk', 'youtube', true, 'published'),
  ('t1-fund-006', 'Sistur - Sistema de Turismo - parte 4', 'live', 'OE', 'Básico', 'Profissionais do turismo, gestores e estudantes', 'Fundamentos do SISTUR e Análise Estrutural do Turismo', 'https://www.youtube.com/live/mVXTuLNlbj8', 'youtube', true, 'published')
ON CONFLICT (training_id) DO UPDATE SET
  title = EXCLUDED.title, type = EXCLUDED.type, pillar = EXCLUDED.pillar, level = EXCLUDED.level,
  target_audience = EXCLUDED.target_audience, objective = EXCLUDED.objective, video_url = EXCLUDED.video_url,
  video_provider = EXCLUDED.video_provider, active = EXCLUDED.active, status = EXCLUDED.status;

-- Link Trilha 1 trainings
INSERT INTO public.edu_track_trainings (track_id, training_id, sort_order, required)
VALUES
  ('e1000000-0001-0001-0001-000000000001', 't1-fund-001', 1, true),
  ('e1000000-0001-0001-0001-000000000001', 't1-fund-002', 2, true),
  ('e1000000-0001-0001-0001-000000000001', 't1-fund-003', 3, true),
  ('e1000000-0001-0001-0001-000000000001', 't1-fund-004', 4, true),
  ('e1000000-0001-0001-0001-000000000001', 't1-fund-005', 5, true),
  ('e1000000-0001-0001-0001-000000000001', 't1-fund-006', 6, true)
ON CONFLICT (track_id, training_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, required = EXCLUDED.required;