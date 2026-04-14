
CREATE TABLE public.photo_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_id UUID NOT NULL REFERENCES public.progress_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, photo_id)
);

ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view likes" ON public.photo_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add likes" ON public.photo_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their likes" ON public.photo_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.photo_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_id UUID NOT NULL REFERENCES public.progress_photos(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view comments" ON public.photo_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add comments" ON public.photo_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their comments" ON public.photo_comments FOR DELETE USING (auth.uid() = user_id);
