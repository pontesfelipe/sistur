-- Create forum posts table
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org', 'public')),
  image_url TEXT,
  category TEXT DEFAULT 'general',
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum replies table
CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post likes table
CREATE TABLE public.forum_post_likes (
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Create reply likes table
CREATE TABLE public.forum_reply_likes (
  reply_id UUID NOT NULL REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (reply_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reply_likes ENABLE ROW LEVEL SECURITY;

-- Posts policies: users can see public posts OR posts from their org
CREATE POLICY "Users can view public posts or their org posts"
ON public.forum_posts FOR SELECT
USING (
  visibility = 'public' 
  OR user_belongs_to_org(auth.uid(), org_id)
);

CREATE POLICY "Users can create posts in their org"
ON public.forum_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND user_belongs_to_org(auth.uid(), org_id)
);

CREATE POLICY "Users can update their own posts"
ON public.forum_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.forum_posts FOR DELETE
USING (auth.uid() = user_id);

-- Replies policies
CREATE POLICY "Users can view replies on visible posts"
ON public.forum_replies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forum_posts p 
    WHERE p.id = post_id 
    AND (p.visibility = 'public' OR user_belongs_to_org(auth.uid(), p.org_id))
  )
);

CREATE POLICY "Users can create replies on visible posts"
ON public.forum_replies FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.forum_posts p 
    WHERE p.id = post_id 
    AND (p.visibility = 'public' OR user_belongs_to_org(auth.uid(), p.org_id))
  )
);

CREATE POLICY "Users can update their own replies"
ON public.forum_replies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
ON public.forum_replies FOR DELETE
USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users can view likes"
ON public.forum_post_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like posts"
ON public.forum_post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
ON public.forum_post_likes FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view reply likes"
ON public.forum_reply_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like replies"
ON public.forum_reply_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike replies"
ON public.forum_reply_likes FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at
BEFORE UPDATE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update post replies count
CREATE OR REPLACE FUNCTION public.update_post_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET replies_count = replies_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET replies_count = replies_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_replies_count_trigger
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.update_post_replies_count();

-- Function to update post likes count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_post_likes_count_trigger
AFTER INSERT OR DELETE ON public.forum_post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Enable realtime for forum
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;