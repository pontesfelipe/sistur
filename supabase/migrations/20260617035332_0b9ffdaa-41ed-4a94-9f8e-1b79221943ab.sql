-- 1. Add structured-review columns to discussion_comments
ALTER TABLE public.discussion_comments
  ADD COLUMN IF NOT EXISTS anchor_type text NULL,
  ADD COLUMN IF NOT EXISTS anchor_ref  text NULL,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS assignee_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS resolved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Constrain anchor_type and status to known values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discussion_comments_anchor_type_check'
  ) THEN
    ALTER TABLE public.discussion_comments
      ADD CONSTRAINT discussion_comments_anchor_type_check
      CHECK (anchor_type IS NULL OR anchor_type IN ('general','pillar','indicator'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discussion_comments_status_check'
  ) THEN
    ALTER TABLE public.discussion_comments
      ADD CONSTRAINT discussion_comments_status_check
      CHECK (status IN ('open','resolved'));
  END IF;
END$$;

-- Helpful index for filtering review items
CREATE INDEX IF NOT EXISTS idx_discussion_comments_entity_status
  ON public.discussion_comments (entity_type, entity_id, status, anchor_type);

-- 2. RPC to toggle status with proper authorization
CREATE OR REPLACE FUNCTION public.set_discussion_comment_status(
  p_comment_id uuid,
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_author uuid;
  v_assignee uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_status NOT IN ('open','resolved') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  SELECT org_id, author_id, assignee_id
    INTO v_org, v_author, v_assignee
    FROM public.discussion_comments
   WHERE id = p_comment_id AND deleted_at IS NULL;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'comment_not_found';
  END IF;

  -- Author or assignee can always toggle; otherwise must be admin/org_admin/analyst of same org
  IF v_uid <> v_author AND (v_assignee IS NULL OR v_uid <> v_assignee) THEN
    IF NOT (
      public.has_role(v_uid, 'ADMIN'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_organizations uo
         WHERE uo.user_id = v_uid
           AND uo.org_id  = v_org
           AND uo.role IN ('ORG_ADMIN','ANALYST')
      )
    ) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  UPDATE public.discussion_comments
     SET status       = p_status,
         resolved_at  = CASE WHEN p_status = 'resolved' THEN now() ELSE NULL END,
         resolved_by  = CASE WHEN p_status = 'resolved' THEN v_uid ELSE NULL END
   WHERE id = p_comment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_discussion_comment_status(uuid, text) TO authenticated;