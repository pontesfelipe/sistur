-- Allow admins to update any forum post (for pinning, moderation)
CREATE POLICY "Admins can update any post"
ON public.forum_posts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- Allow admins to delete any forum post (moderation)
CREATE POLICY "Admins can delete any post"
ON public.forum_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- Allow admins to delete any forum reply (moderation)
CREATE POLICY "Admins can delete any reply"
ON public.forum_replies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));