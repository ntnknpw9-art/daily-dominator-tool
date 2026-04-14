
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  mode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
ON public.ai_chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
ON public.ai_chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.ai_chat_messages FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_ai_chat_messages_user_id ON public.ai_chat_messages (user_id, created_at);
