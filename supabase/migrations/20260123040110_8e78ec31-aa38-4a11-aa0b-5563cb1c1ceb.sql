-- Add privacy setting to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS forum_show_identity boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.forum_show_identity IS 'Whether to show user identity (name/avatar) on public forum posts';

-- Create a secure view for public forum posts that hides sensitive UUIDs
CREATE OR REPLACE VIEW public.public_forum_posts_view AS
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
  -- Only show identity if user allows it
  CASE 
    WHEN p.forum_show_identity = true THEN p.full_name
    ELSE 'Usuário Anônimo'
  END as author_name,
  CASE 
    WHEN p.forum_show_identity = true THEN p.avatar_url
    ELSE NULL
  END as author_avatar,
  -- Allow frontend to check ownership without exposing the actual UUID
  (fp.user_id = auth.uid()) as is_owner,
  -- Check if current user liked this post
  EXISTS (
    SELECT 1 FROM forum_post_likes fpl 
    WHERE fpl.post_id = fp.id AND fpl.user_id = auth.uid()
  ) as is_liked
FROM public.forum_posts fp
LEFT JOIN public.profiles p ON p.user_id = fp.user_id
WHERE fp.visibility = 'public';

-- Grant access to the view
GRANT SELECT ON public.public_forum_posts_view TO authenticated;
GRANT SELECT ON public.public_forum_posts_view TO anon;

-- Create a secure view for public replies as well
CREATE OR REPLACE VIEW public.public_forum_replies_view AS
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

GRANT SELECT ON public.public_forum_replies_view TO authenticated;
GRANT SELECT ON public.public_forum_replies_view TO anon;