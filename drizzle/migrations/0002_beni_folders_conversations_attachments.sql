CREATE TABLE public.beni_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beni_folders TO authenticated;
GRANT ALL ON public.beni_folders TO service_role;
ALTER TABLE public.beni_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own folders" ON public.beni_folders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.beni_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folder_id uuid REFERENCES public.beni_folders(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  share_token text UNIQUE,
  share_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_beni_conversations_user ON public.beni_conversations(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beni_conversations TO authenticated;
GRANT ALL ON public.beni_conversations TO service_role;
ALTER TABLE public.beni_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.beni_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.beni_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.beni_conversations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime text,
  size bigint,
  relevant boolean,
  relevance_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beni_attachments TO authenticated;
GRANT ALL ON public.beni_attachments TO service_role;
ALTER TABLE public.beni_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attachments" ON public.beni_attachments FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.beni_chat_messages
  ADD COLUMN conversation_id uuid REFERENCES public.beni_conversations(id) ON DELETE CASCADE,
  ADD COLUMN attachment_id uuid REFERENCES public.beni_attachments(id) ON DELETE SET NULL;
CREATE INDEX idx_beni_chat_messages_conv ON public.beni_chat_messages(conversation_id, created_at);

-- Backfill: uma conversa "Conversa anterior" por usuário com histórico
INSERT INTO public.beni_conversations (user_id, title, created_at, updated_at)
SELECT user_id, 'Conversa anterior', min(created_at), max(created_at)
FROM public.beni_chat_messages GROUP BY user_id;
UPDATE public.beni_chat_messages m SET conversation_id = c.id
FROM public.beni_conversations c
WHERE c.user_id = m.user_id AND c.title = 'Conversa anterior' AND m.conversation_id IS NULL;

-- Leitura pública de conversa compartilhada
CREATE OR REPLACE FUNCTION public.get_shared_beni_conversation(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
    'title', c.title,
    'updated_at', c.updated_at,
    'messages', COALESCE((SELECT jsonb_agg(jsonb_build_object('role', m.role, 'content', m.content, 'created_at', m.created_at) ORDER BY m.created_at)
       FROM public.beni_chat_messages m WHERE m.conversation_id = c.id), '[]'::jsonb)
  ) END
  FROM public.beni_conversations c
  WHERE c.share_token = _token AND c.share_enabled = true AND length(_token) >= 16
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_beni_conversation(text) TO anon, authenticated;

CREATE POLICY "beni attachments own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'beni-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "beni attachments own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'beni-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "beni attachments own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'beni-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);