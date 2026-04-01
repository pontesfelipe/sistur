
-- Knowledge Base files table
CREATE TABLE public.knowledge_base_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base_files ENABLE ROW LEVEL SECURITY;

-- RLS: users can view files from their org
CREATE POLICY "Users can view own org KB files"
  ON public.knowledge_base_files FOR SELECT
  TO authenticated
  USING (org_id = public.get_effective_org_id());

-- RLS: authenticated users can upload files to their org
CREATE POLICY "Users can insert KB files to own org"
  ON public.knowledge_base_files FOR INSERT
  TO authenticated
  WITH CHECK (org_id = public.get_effective_org_id());

-- RLS: uploaders or admins can update
CREATE POLICY "Uploaders and admins can update KB files"
  ON public.knowledge_base_files FOR UPDATE
  TO authenticated
  USING (
    org_id = public.get_effective_org_id() 
    AND (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
  );

-- RLS: uploaders or admins can delete
CREATE POLICY "Uploaders and admins can delete KB files"
  ON public.knowledge_base_files FOR DELETE
  TO authenticated
  USING (
    org_id = public.get_effective_org_id() 
    AND (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
  );

-- Storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('knowledge-base', 'knowledge-base', false, 20971520);

-- Storage RLS: users can upload to their org folder
CREATE POLICY "Users can upload KB files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'knowledge-base');

-- Storage RLS: users can read from their org folder
CREATE POLICY "Users can read KB files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'knowledge-base');

-- Storage RLS: users can delete their uploads
CREATE POLICY "Users can delete KB files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'knowledge-base');

-- Index for fast org-based queries
CREATE INDEX idx_kb_files_org ON public.knowledge_base_files(org_id);
CREATE INDEX idx_kb_files_dest ON public.knowledge_base_files(destination_id);
