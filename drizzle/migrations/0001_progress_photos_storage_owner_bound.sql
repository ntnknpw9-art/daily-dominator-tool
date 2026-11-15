DROP POLICY IF EXISTS "Users view own or public progress photos" ON storage.objects;

CREATE POLICY "Users view own or public progress photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (
    -- Owner: files in your own folder
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR
    -- Shared: only a file its own uploader published as public, and not between blocked users
    EXISTS (
      SELECT 1 FROM public.progress_photos pp
      WHERE pp.is_public = true
        AND pp.user_id::text = (storage.foldername(objects.name))[1]
        AND right(pp.image_url, length('/progress-photos/' || objects.name)) = '/progress-photos/' || objects.name
        AND NOT public.is_blocked_with(pp.user_id)
    )
  )
);