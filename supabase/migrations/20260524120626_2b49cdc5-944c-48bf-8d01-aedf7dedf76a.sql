-- Warrior portraits table: stores AI-generated daily warrior images per user
CREATE TABLE public.warrior_portraits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portrait_date DATE NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  stats JSONB,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, portrait_date)
);

ALTER TABLE public.warrior_portraits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portraits"
  ON public.warrior_portraits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portraits"
  ON public.warrior_portraits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portraits"
  ON public.warrior_portraits FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_warrior_portraits_user_date ON public.warrior_portraits(user_id, portrait_date DESC);

-- Storage bucket for warrior portraits (public read for sharing)
INSERT INTO storage.buckets (id, name, public) VALUES ('warrior-portraits', 'warrior-portraits', true);

CREATE POLICY "Warrior portraits are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'warrior-portraits');

CREATE POLICY "Users can upload their own warrior portraits"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'warrior-portraits' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own warrior portraits"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'warrior-portraits' AND auth.uid()::text = (storage.foldername(name))[1]);