-- Drop and recreate views with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.public_forum_posts_view;
DROP VIEW IF EXISTS public.public_forum_replies_view;

-- Recreate view for public forum posts with security invoker
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
  CASE 
    WHEN p.forum_show_identity = true THEN p.full_name
    ELSE 'Usuário Anônimo'
  END as author_name,
  CASE 
    WHEN p.forum_show_identity = true THEN p.avatar_url
    ELSE NULL
  END as author_avatar,
  (fp.user_id = auth.uid()) as is_owner,
  EXISTS (
    SELECT 1 FROM forum_post_likes fpl 
    WHERE fpl.post_id = fp.id AND fpl.user_id = auth.uid()
  ) as is_liked
FROM public.forum_posts fp
LEFT JOIN public.profiles p ON p.user_id = fp.user_id
WHERE fp.visibility = 'public';

-- Recreate view for public replies with security invoker
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
  CASE 
    WHEN p.forum_show_identity = true THEN p.full_name
    ELSE 'Usuário Anônimo'
  END as author_name,
  CASE 
    WHEN p.forum_show_identity = true THEN p.avatar_url
    ELSE NULL
  END as author_avatar,
  (fr.user_id = auth.uid()) as is_owner,
  EXISTS (
    SELECT 1 FROM forum_reply_likes frl 
    WHERE frl.reply_id = fr.id AND frl.user_id = auth.uid()
  ) as is_liked
FROM public.forum_replies fr
LEFT JOIN public.profiles p ON p.user_id = fr.user_id
JOIN public.forum_posts fp ON fp.id = fr.post_id
WHERE fp.visibility = 'public';

-- Grant access
GRANT SELECT ON public.public_forum_posts_view TO authenticated;
GRANT SELECT ON public.public_forum_posts_view TO anon;
GRANT SELECT ON public.public_forum_replies_view TO authenticated;
GRANT SELECT ON public.public_forum_replies_view TO anon;