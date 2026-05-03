
CREATE TABLE IF NOT EXISTS public.edu_daily_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  mission_code text NOT NULL,
  title text NOT NULL,
  description text,
  target integer NOT NULL DEFAULT 1,
  progress integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 25,
  completed_at timestamptz,
  bonus_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_date, mission_code)
);

CREATE INDEX IF NOT EXISTS idx_edu_daily_missions_user_date
  ON public.edu_daily_missions (user_id, mission_date);

ALTER TABLE public.edu_daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own daily missions"
  ON public.edu_daily_missions FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "User inserts own daily missions"
  ON public.edu_daily_missions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User updates own daily missions"
  ON public.edu_daily_missions FOR UPDATE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admin deletes daily missions"
  ON public.edu_daily_missions FOR DELETE
  USING (public.has_role(auth.uid(), 'ADMIN'));
