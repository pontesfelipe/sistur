-- 1) Função: usuário pode comentar em conteúdo de uma org?
CREATE OR REPLACE FUNCTION public.can_comment_on_org(p_org_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_pending boolean;
  v_user_org uuid;
  v_org_name text;
BEGIN
  IF v_uid IS NULL OR p_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- ADMIN sempre pode
  IF has_role(v_uid, 'ADMIN'::app_role) THEN
    RETURN true;
  END IF;

  SELECT pending_approval, org_id INTO v_pending, v_user_org
  FROM public.profiles WHERE user_id = v_uid LIMIT 1;

  IF v_pending IS TRUE THEN RETURN false; END IF;
  IF v_user_org IS NULL OR v_user_org <> p_org_id THEN RETURN false; END IF;

  SELECT name INTO v_org_name FROM public.orgs WHERE id = v_user_org;
  IF v_org_name IN ('Autônomo', 'Temporário') THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_comment_on_org(uuid, uuid) TO authenticated;

-- 2) Tabela de comentários
CREATE TABLE IF NOT EXISTS public.discussion_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('assessment','report')),
  entity_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 4000),
  mentioned_user_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  parent_id uuid REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discussion_comments_entity
  ON public.discussion_comments(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_org
  ON public.discussion_comments(org_id);

ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_discussion_comments_updated ON public.discussion_comments;
CREATE TRIGGER trg_discussion_comments_updated
BEFORE UPDATE ON public.discussion_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RLS
DROP POLICY IF EXISTS "comments_select_org_members" ON public.discussion_comments;
CREATE POLICY "comments_select_org_members"
ON public.discussion_comments FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'ADMIN'::app_role)
  OR (
    user_belongs_to_org(auth.uid(), org_id)
    AND public.can_comment_on_org(org_id)
  )
);

DROP POLICY IF EXISTS "comments_insert_eligible" ON public.discussion_comments;
CREATE POLICY "comments_insert_eligible"
ON public.discussion_comments FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.can_comment_on_org(org_id)
);

DROP POLICY IF EXISTS "comments_update_own" ON public.discussion_comments;
CREATE POLICY "comments_update_own"
ON public.discussion_comments FOR UPDATE
TO authenticated
USING (author_id = auth.uid() OR has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (author_id = auth.uid() OR has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON public.discussion_comments;
CREATE POLICY "comments_delete_own_or_admin"
ON public.discussion_comments FOR DELETE
TO authenticated
USING (author_id = auth.uid() OR has_role(auth.uid(), 'ADMIN'::app_role));

-- 4) Listar membros mencionáveis
CREATE OR REPLACE FUNCTION public.list_mentionable_members(p_org_id uuid, p_search text DEFAULT NULL)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF NOT public.can_comment_on_org(p_org_id) THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.user_id, COALESCE(p.full_name, 'Usuário')
  FROM public.profiles p
  WHERE p.org_id = p_org_id
    AND COALESCE(p.pending_approval, false) = false
    AND p.user_id <> v_uid
    AND (
      p_search IS NULL
      OR p_search = ''
      OR p.full_name ILIKE '%' || p_search || '%'
    )
  ORDER BY p.full_name NULLS LAST
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_mentionable_members(uuid, text) TO authenticated;

-- 5) Trigger: notificar usuários mencionados
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_link text;
  v_author_name text;
BEGIN
  IF NEW.mentioned_user_ids IS NULL OR array_length(NEW.mentioned_user_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Alguém') INTO v_author_name
  FROM public.profiles WHERE user_id = NEW.author_id;

  v_link := CASE NEW.entity_type
    WHEN 'assessment' THEN '/diagnosticos/' || NEW.entity_id::text
    WHEN 'report'     THEN '/relatorios?reportId=' || NEW.entity_id::text
    ELSE '/'
  END;

  FOREACH v_uid IN ARRAY NEW.mentioned_user_ids LOOP
    IF v_uid = NEW.author_id THEN CONTINUE; END IF;
    INSERT INTO public.edu_notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_uid,
      'comment_mention',
      v_author_name || ' mencionou você em um comentário',
      left(NEW.body, 240),
      v_link,
      jsonb_build_object(
        'comment_id', NEW.id,
        'entity_type', NEW.entity_type,
        'entity_id', NEW.entity_id,
        'author_id', NEW.author_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_mentions ON public.discussion_comments;
CREATE TRIGGER trg_notify_comment_mentions
AFTER INSERT ON public.discussion_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions();