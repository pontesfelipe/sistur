-- Create storage bucket for forum attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-attachments', 
  'forum-attachments', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'application/pdf']
);

-- RLS policies for forum attachments bucket
CREATE POLICY "Anyone can view forum attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-attachments');

CREATE POLICY "Authenticated users can upload forum attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'forum-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own forum attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'forum-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add attachment_url column to forum_posts if not exists
ALTER TABLE public.forum_posts 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;