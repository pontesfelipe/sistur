ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.org_paid_seat_limit(_org uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT max(s.quantity) FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id
  WHERE s.org_id = _org AND p.seat_based AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
$$;
REVOKE EXECUTE ON FUNCTION public.org_paid_seat_limit(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.org_paid_seat_limit(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_org_seat_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit integer; v_count integer;
BEGIN
  IF NEW.org_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.org_id IS NOT DISTINCT FROM OLD.org_id) THEN
    RETURN NEW;
  END IF;
  v_limit := public.org_paid_seat_limit(NEW.org_id);
  IF v_limit IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_count FROM public.profiles WHERE org_id = NEW.org_id AND user_id <> NEW.user_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de % usuários do plano atingido. Aumente a quantidade de usuários na assinatura.', v_limit
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_org_seat_limit ON public.profiles;
CREATE TRIGGER trg_enforce_org_seat_limit BEFORE INSERT OR UPDATE OF org_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_org_seat_limit();