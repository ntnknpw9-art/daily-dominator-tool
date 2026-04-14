
-- Storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', true);

-- Storage policies
CREATE POLICY "Users can upload their own progress photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own progress photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view progress photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'progress-photos');

-- Progress photos table
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  photo_type TEXT NOT NULL DEFAULT 'after',
  caption TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  photo_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos"
ON public.progress_photos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public photos"
ON public.progress_photos FOR SELECT
TO authenticated
USING (is_public = true);

CREATE POLICY "Users can insert their own photos"
ON public.progress_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
ON public.progress_photos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.progress_photos FOR DELETE
USING (auth.uid() = user_id);
