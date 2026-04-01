
-- Table for admin-managed global reference documents
CREATE TABLE public.global_reference_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT '',
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'plano_nacional',
  summary TEXT,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_reference_files ENABLE ROW LEVEL SECURITY;

-- Only admins can manage global reference files
CREATE POLICY "Admins can view global references"
  ON public.global_reference_files FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can insert global references"
  ON public.global_reference_files FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can update global references"
  ON public.global_reference_files FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can delete global references"
  ON public.global_reference_files FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Storage bucket for global reference files
INSERT INTO storage.buckets (id, name, public)
VALUES ('global-references', 'global-references', false);

-- Storage policies - admin only
CREATE POLICY "Admins can upload global references"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'global-references' AND public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can read global references"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'global-references' AND public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can delete global references"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'global-references' AND public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Service role needs to read for edge functions (generate-report)
-- Edge functions use service role key so no RLS policy needed for that
