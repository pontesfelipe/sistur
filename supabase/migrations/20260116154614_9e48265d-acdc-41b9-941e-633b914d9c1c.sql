-- Create table to store Professor Beni chat messages per user
CREATE TABLE public.beni_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries by user
CREATE INDEX idx_beni_chat_messages_user_id ON public.beni_chat_messages(user_id);
CREATE INDEX idx_beni_chat_messages_created_at ON public.beni_chat_messages(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE public.beni_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only view their own messages
CREATE POLICY "Users can view their own chat messages"
ON public.beni_chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert their own chat messages"
ON public.beni_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own chat messages"
ON public.beni_chat_messages
FOR DELETE
USING (auth.uid() = user_id);