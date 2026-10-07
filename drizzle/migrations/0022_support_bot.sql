CREATE TABLE public.support_kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  content text NOT NULL,
  steps text[] NOT NULL DEFAULT '{}',
  routes text[] NOT NULL DEFAULT '{}',
  roles text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  action_label text,
  action_route text,
  source text NOT NULL DEFAULT 'manual',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_kb_articles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.support_kb_articles TO authenticated;
GRANT ALL ON public.support_kb_articles TO service_role;
ALTER TABLE public.support_kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb read active" ON public.support_kb_articles FOR SELECT TO authenticated USING (is_active OR public.is_sistur_admin(auth.uid()));
CREATE POLICY "kb admin write" ON public.support_kb_articles FOR ALL TO authenticated USING (public.is_sistur_admin(auth.uid())) WITH CHECK (public.is_sistur_admin(auth.uid()));

CREATE TABLE public.support_guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_guardrails TO authenticated;
GRANT ALL ON public.support_guardrails TO service_role;
ALTER TABLE public.support_guardrails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guardrails admin" ON public.support_guardrails FOR ALL TO authenticated USING (public.is_sistur_admin(auth.uid())) WITH CHECK (public.is_sistur_admin(auth.uid()));

CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  route text,
  status text NOT NULL DEFAULT 'open',
  escalated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv own or admin read" ON public.support_conversations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_sistur_admin(auth.uid()));
CREATE POLICY "conv own insert" ON public.support_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "conv own update" ON public.support_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_sistur_admin(auth.uid()));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  answered_from text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg read" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR public.is_sistur_admin(auth.uid()))));

CREATE TABLE public.support_learned_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text,
  status text NOT NULL DEFAULT 'pending',
  route text,
  conversation_id uuid,
  occurrences int NOT NULL DEFAULT 1,
  helpful boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_learned_qa TO authenticated;
GRANT ALL ON public.support_learned_qa TO service_role;
ALTER TABLE public.support_learned_qa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learned admin" ON public.support_learned_qa FOR ALL TO authenticated USING (public.is_sistur_admin(auth.uid())) WITH CHECK (public.is_sistur_admin(auth.uid()));
CREATE INDEX support_learned_status_idx ON public.support_learned_qa(status);
CREATE INDEX support_messages_conv_idx ON public.support_messages(conversation_id, created_at);