
-- Streak fields already exist on edu_user_xp; ensure columns
ALTER TABLE public.edu_user_xp
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date,
  ADD COLUMN IF NOT EXISTS equipped_avatar text,
  ADD COLUMN IF NOT EXISTS equipped_theme text;

-- Rewards catalog (avatares/temas desbloqueáveis por nível)
CREATE TABLE IF NOT EXISTS public.edu_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('avatar','theme')),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  value text NOT NULL,             -- emoji para avatar; classe/cor para tema
  unlock_level integer NOT NULL DEFAULT 1,
  icon text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edu_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view active rewards" ON public.edu_rewards;
CREATE POLICY "Anyone authenticated can view active rewards"
ON public.edu_rewards FOR SELECT TO authenticated USING (active = true);

DROP POLICY IF EXISTS "Admins manage rewards" ON public.edu_rewards;
CREATE POLICY "Admins manage rewards"
ON public.edu_rewards FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'ADMIN'))
WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

-- Seed initial catalog
INSERT INTO public.edu_rewards (type, code, name, description, value, unlock_level, icon) VALUES
  ('avatar','avatar_seedling','Broto','Avatar inicial (nível 1)','🌱',1,'Sprout'),
  ('avatar','avatar_book','Estudante','Desbloqueado no nível 3','📚',3,'BookOpen'),
  ('avatar','avatar_rocket','Foguete','Desbloqueado no nível 5','🚀',5,'Rocket'),
  ('avatar','avatar_trophy','Campeão','Desbloqueado no nível 10','🏆',10,'Trophy'),
  ('avatar','avatar_star','Estrela','Desbloqueado no nível 15','⭐',15,'Star'),
  ('avatar','avatar_crown','Mestre','Desbloqueado no nível 20','👑',20,'Crown'),
  ('theme','theme_default','Padrão','Tema padrão da plataforma','default',1,'Palette'),
  ('theme','theme_ocean','Oceano','Desbloqueado no nível 5','ocean',5,'Waves'),
  ('theme','theme_forest','Floresta','Desbloqueado no nível 10','forest',10,'Trees'),
  ('theme','theme_sunset','Pôr-do-sol','Desbloqueado no nível 15','sunset',15,'Sunset')
ON CONFLICT (code) DO NOTHING;
