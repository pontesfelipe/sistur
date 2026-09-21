-- 1. Remove SECURITY DEFINER from public forum views.
CREATE OR REPLACE FUNCTION public.forum_author_display(p_user_id uuid)
RETURNS TABLE(author_name text, author_avatar text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN p.forum_show_identity = true THEN p.full_name ELSE 'Usuário Anônimo' END,
    CASE WHEN p.forum_show_identity = true THEN p.avatar_url ELSE NULL END
  FROM public.profiles p
  WHERE p.user_id = p_user_id
$$;

GRANT EXECUTE ON FUNCTION public.forum_author_display(uuid) TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.public_forum_posts_view;
CREATE VIEW public.public_forum_posts_view
WITH (security_invoker = true) AS
SELECT
  fp.id,
  fp.title,
  fp.content,
  fp.category,
  fp.visibility,
  fp.image_url,
  fp.likes_count,
  fp.replies_count,
  fp.created_at,
  fp.updated_at,
  COALESCE(a.author_name, 'Usuário Anônimo') AS author_name,
  a.author_avatar,
  fp.user_id = auth.uid() AS is_owner,
  EXISTS (
    SELECT 1 FROM public.forum_post_likes fpl
    WHERE fpl.post_id = fp.id AND fpl.user_id = auth.uid()
  ) AS is_liked
FROM public.forum_posts fp
LEFT JOIN LATERAL public.forum_author_display(fp.user_id) a ON true
WHERE fp.visibility = 'public';

DROP VIEW IF EXISTS public.public_forum_replies_view;
CREATE VIEW public.public_forum_replies_view
WITH (security_invoker = true) AS
SELECT
  fr.id,
  fr.post_id,
  fr.parent_reply_id,
  fr.content,
  fr.likes_count,
  fr.is_solution,
  fr.created_at,
  fr.updated_at,
  COALESCE(a.author_name, 'Usuário Anônimo') AS author_name,
  a.author_avatar,
  fr.user_id = auth.uid() AS is_owner,
  EXISTS (
    SELECT 1 FROM public.forum_reply_likes frl
    WHERE frl.reply_id = fr.id AND frl.user_id = auth.uid()
  ) AS is_liked
FROM public.forum_replies fr
JOIN public.forum_posts fp ON fp.id = fr.post_id
LEFT JOIN LATERAL public.forum_author_display(fr.user_id) a ON true
WHERE fp.visibility = 'public';

GRANT SELECT ON public.public_forum_posts_view TO anon, authenticated;
GRANT SELECT ON public.public_forum_replies_view TO anon, authenticated;

-- 2. assessment_indicator_audit: explicit authenticated scope + non-null org guard.
DROP POLICY IF EXISTS "Admins and org admins can view audit" ON public.assessment_indicator_audit;
CREATE POLICY "Admins and org admins can view audit"
ON public.assessment_indicator_audit
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_indicator_audit.assessment_id
        AND a.org_id IS NOT NULL
        AND has_role_in_org(auth.uid(), a.org_id, 'ORG_ADMIN'::app_role)
    )
  )
);

-- 3. forum-attachments: no anonymous object listing/reads through the API.
DROP POLICY IF EXISTS "Anyone can view forum attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view forum attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'forum-attachments');

-- 4. profiles: hide pending/blocked members and the block reason from peers.
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
CREATE POLICY "Users can view profiles in their org"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    user_belongs_to_org(auth.uid(), org_id)
    AND COALESCE(pending_approval, false) = false
    AND blocked_at IS NULL
  )
);

REVOKE SELECT (blocked_reason, approval_requested_at) ON public.profiles FROM authenticated;
REVOKE SELECT (blocked_reason, approval_requested_at) ON public.profiles FROM anon;