DROP POLICY IF EXISTS "Warrior portraits are publicly viewable" ON storage.objects;

CREATE POLICY "Users can list their own warrior portraits"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'warrior-portraits' AND auth.uid()::text = (storage.foldername(name))[1]);