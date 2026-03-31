
-- Content moderation settings table
CREATE TABLE public.content_moderation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  strictness_level INTEGER NOT NULL DEFAULT 3 CHECK (strictness_level >= 1 AND strictness_level <= 5),
  auto_reject_enabled BOOLEAN NOT NULL DEFAULT true,
  require_image_review BOOLEAN NOT NULL DEFAULT false,
  max_images_per_post INTEGER NOT NULL DEFAULT 6,
  allowed_categories TEXT[] NOT NULL DEFAULT ARRAY['tourism', 'professional', 'educational', 'maps', 'documents'],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(org_id)
);

ALTER TABLE public.content_moderation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view moderation settings"
ON public.content_moderation_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admins can insert moderation settings"
ON public.content_moderation_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admins can update moderation settings"
ON public.content_moderation_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- Add image_urls array column to forum_posts for multi-image support
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
