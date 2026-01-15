-- ===========================================
-- SISTUR EDU: Link all trainings to their tracks + remaining trainings
-- ===========================================

-- Link Trilha 2 trainings
INSERT INTO public.edu_track_trainings (track_id, training_id, sort_order, required)
SELECT 'e1000000-0001-0001-0001-000000000002', training_id, ROW_NUMBER() OVER (ORDER BY training_id), true
FROM public.edu_trainings WHERE training_id LIKE 't2-%'
ON CONFLICT (track_id, training_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- Link Trilha 3 trainings  
INSERT INTO public.edu_track_trainings (track_id, training_id, sort_order, required)
SELECT 'e1000000-0001-0001-0001-000000000003', training_id, ROW_NUMBER() OVER (ORDER BY training_id), true
FROM public.edu_trainings WHERE training_id LIKE 't3-%'
ON CONFLICT (track_id, training_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- Add key Trilha 4 trainings (Relações Ambientais, Sustentabilidade)
INSERT INTO public.edu_trainings (training_id, title, type, pillar, level, target_audience, objective, video_url, video_provider, active, status)
VALUES
  ('t4-ra-001', 'A Importância da Inter e Transdisciplinaridade no Cenário Turístico', 'live', 'AO', 'Intermediário', 'Gestores públicos, empresas do trade e operações', 'Gestão de Crises, Segurança e Retomada do Turismo', 'https://www.youtube.com/live/23K-8lvyKbI', 'youtube', true, 'published'),
  ('t4-ra-002', 'Sustentabilidade e Turismo Responsável', 'live', 'RA', 'Intermediário', 'Gestores públicos, consultores, comunidade', 'Sustentabilidade, Turismo Responsável e Regeneração', 'https://www.youtube.com/watch?v=RZEaDFzh_Ko', 'youtube', true, 'published'),
  ('t4-ra-003', 'Turismo Regenerativo: da economia de serviço para economia da experiência', 'live', 'RA', 'Intermediário', 'Gestores públicos, consultores, comunidade', 'Sustentabilidade, Turismo Responsável e Regeneração', 'https://www.youtube.com/live/Jg7lUlvwmqI', 'youtube', true, 'published'),
  ('t4-ra-004', 'Turismo Religioso e suas projeções até 2030', 'live', 'RA', 'Avançado', 'Gestores de destinos, operadores, comunidades', 'Turismo Religioso, Peregrinações e Identidade Cultural', 'https://www.youtube.com/watch?v=q403ZbE8-dw', 'youtube', true, 'published'),
  ('t4-ra-005', 'A importância do Turismo na Agenda 2030 da OMT', 'live', 'RA', 'Avançado', 'Gestores públicos, consultores, comunidade', 'Sustentabilidade, Turismo Responsável e Regeneração', 'https://www.youtube.com/live/AenNHxyIIME', 'youtube', true, 'published')
ON CONFLICT (training_id) DO UPDATE SET title = EXCLUDED.title, pillar = EXCLUDED.pillar;

-- Link Trilha 4 trainings
INSERT INTO public.edu_track_trainings (track_id, training_id, sort_order, required)
SELECT 'e1000000-0001-0001-0001-000000000004', training_id, ROW_NUMBER() OVER (ORDER BY training_id), true
FROM public.edu_trainings WHERE training_id LIKE 't4-%'
ON CONFLICT (track_id, training_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- Add key Trilha 5 trainings (Inovação e Tecnologia)
INSERT INTO public.edu_trainings (training_id, title, type, pillar, level, target_audience, objective, video_url, video_provider, active, status)
VALUES
  ('t5-inov-001', 'Aprendizado contínuo para se adaptar às mudanças globais', 'live', 'AO', 'Avançado', 'Gestores, inovadores, TI/Produto e liderança', 'Inovação, Tecnologia e Destinos Turísticos Inteligentes', 'https://www.youtube.com/live/P5aA9kzt7NQ', 'youtube', true, 'published'),
  ('t5-inov-002', 'Destinos Turísticos Inteligentes - DTIs', 'live', 'AO', 'Avançado', 'Gestores, inovadores, TI/Produto e liderança', 'Inovação, Tecnologia e Destinos Turísticos Inteligentes', 'https://www.youtube.com/live/KbKwGkKDh4U', 'youtube', true, 'published'),
  ('t5-inov-003', 'Inovação Aberta e Centros de Inovação em Turismo', 'live', 'AO', 'Avançado', 'Gestores, inovadores, TI/Produto e liderança', 'Inovação, Tecnologia e Destinos Turísticos Inteligentes', 'https://www.youtube.com/live/DKNB7AYlF-w', 'youtube', true, 'published')
ON CONFLICT (training_id) DO UPDATE SET title = EXCLUDED.title, pillar = EXCLUDED.pillar;

-- Link Trilha 5 trainings
INSERT INTO public.edu_track_trainings (track_id, training_id, sort_order, required)
SELECT 'e1000000-0001-0001-0001-000000000005', training_id, ROW_NUMBER() OVER (ORDER BY training_id), true
FROM public.edu_trainings WHERE training_id LIKE 't5-%'
ON CONFLICT (track_id, training_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;