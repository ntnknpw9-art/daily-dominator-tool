-- 1. Make progress-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'progress-photos';

-- 2. Drop overly-permissive policies
DROP POLICY IF EXISTS "Anyone can view progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own progress photos" ON storage.objects;

-- 3. New SELECT policy: owner OR a public progress_photos row references this object
CREATE POLICY "Users view own or public progress photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.progress_photos pp
      WHERE pp.is_public = true
        AND pp.image_url LIKE '%/progress-photos/' || name
    )
  )
);

-- 4. INSERT policy scoped to user's own folder
CREATE POLICY "Users upload to own folder in progress photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Remove client-side achievement self-insert (must go through server logic)
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;