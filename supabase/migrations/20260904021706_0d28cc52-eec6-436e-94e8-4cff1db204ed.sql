CREATE TABLE IF NOT EXISTS public.trial_state (
  subject_id uuid NOT NULL,
  subject_kind text NOT NULL CHECK (subject_kind IN ('user','org')),
  training_consumed_at timestamptz,
  assessment_run_at timestamptz,
  converted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, subject_kind)
);

GRANT SELECT ON public.trial_state TO authenticated;
GRANT ALL ON public.trial_state TO service_role;
ALTER TABLE public.trial_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_state_read_own" ON public.trial_state FOR SELECT TO authenticated
  USING (
    (subject_kind = 'user' AND subject_id = auth.uid())
    OR (subject_kind = 'org' AND subject_id = public.get_user_org_id(auth.uid()))
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "trial_state_admin_manage" ON public.trial_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Base existente permanece com acesso integral (grandfathering)
INSERT INTO public.trial_state (subject_id, subject_kind, converted_at, notes)
SELECT id, 'user', now(), 'Base existente — acesso integral mantido'
FROM public.profiles
ON CONFLICT (subject_id, subject_kind) DO NOTHING;

INSERT INTO public.trial_state (subject_id, subject_kind, converted_at, notes)
SELECT id, 'org', now(), 'Base existente — acesso integral mantido'
FROM public.orgs
ON CONFLICT (subject_id, subject_kind) DO NOTHING;

-- Marca o treinamento do trial como consumido ao concluir (progresso 100%)
CREATE OR REPLACE FUNCTION public._trial_mark_training_consumed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.progress_percent IS NOT NULL AND NEW.progress_percent >= 100 AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.trial_state (subject_id, subject_kind, training_consumed_at)
    VALUES (NEW.user_id, 'user', now())
    ON CONFLICT (subject_id, subject_kind)
    DO UPDATE SET training_consumed_at = COALESCE(trial_state.training_consumed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trial_training_consumed ON public.edu_progress;
CREATE TRIGGER trg_trial_training_consumed
AFTER INSERT OR UPDATE OF progress_percent ON public.edu_progress
FOR EACH ROW EXECUTE FUNCTION public._trial_mark_training_consumed();

-- Registra a rodada de diagnostico do trial da organizacao
CREATE OR REPLACE FUNCTION public.record_trial_assessment(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _org_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;

  INSERT INTO public.trial_state (subject_id, subject_kind, assessment_run_at)
  VALUES (_org_id, 'org', now())
  ON CONFLICT (subject_id, subject_kind)
  DO UPDATE SET assessment_run_at = COALESCE(trial_state.assessment_run_at, now());

  RETURN jsonb_build_object('recorded', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_trial_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_trial_assessment(uuid) TO authenticated, service_role;

-- Estado do trial para a interface
CREATE OR REPLACE FUNCTION public.get_my_trial_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_user_state public.trial_state%ROWTYPE;
  v_org_state public.trial_state%ROWTYPE;
  v_has_subscription boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  v_org := public.get_effective_org_id();

  SELECT * INTO v_user_state FROM public.trial_state
  WHERE subject_id = v_user AND subject_kind = 'user';

  IF v_org IS NOT NULL THEN
    SELECT * INTO v_org_state FROM public.trial_state
    WHERE subject_id = v_org AND subject_kind = 'org';

    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.status IN ('active','trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
        AND (s.user_id = v_user OR s.org_id = v_org)
    ) INTO v_has_subscription;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.status IN ('active','trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
        AND s.user_id = v_user
    ) INTO v_has_subscription;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'has_subscription', v_has_subscription,
    'user_trialing', (NOT v_has_subscription) AND (v_user_state.subject_id IS NULL OR v_user_state.converted_at IS NULL),
    'org_trialing', (NOT v_has_subscription) AND v_org IS NOT NULL AND (v_org_state.subject_id IS NULL OR v_org_state.converted_at IS NULL),
    'training_consumed', v_user_state.training_consumed_at IS NOT NULL,
    'assessment_used', v_org_state.assessment_run_at IS NOT NULL,
    'org_id', v_org
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_trial_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_trial_state() TO authenticated;

-- Conversao manual (admin): encerra o trial com acesso liberado
CREATE OR REPLACE FUNCTION public.admin_convert_trial(_subject_id uuid, _subject_kind text, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _subject_kind NOT IN ('user','org') THEN
    RAISE EXCEPTION 'invalid_kind';
  END IF;

  INSERT INTO public.trial_state (subject_id, subject_kind, converted_at, notes)
  VALUES (_subject_id, _subject_kind, now(), _notes)
  ON CONFLICT (subject_id, subject_kind)
  DO UPDATE SET converted_at = now(), notes = COALESCE(_notes, trial_state.notes), updated_at = now();

  RETURN jsonb_build_object('converted', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_convert_trial(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_convert_trial(uuid, text, text) TO authenticated;