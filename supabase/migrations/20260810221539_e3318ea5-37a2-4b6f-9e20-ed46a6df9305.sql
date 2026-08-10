-- 1) Enforce user blocks at the database level for photo interactions
CREATE OR REPLACE FUNCTION public.is_blocked_with(_other uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE (ub.blocker_id = _other AND ub.blocked_id = auth.uid())
       OR (ub.blocker_id = auth.uid() AND ub.blocked_id = _other)
  )
$$;

REVOKE ALL ON FUNCTION public.is_blocked_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_with(uuid) TO authenticated;

-- photo_comments
DROP POLICY IF EXISTS "Users can add comments" ON public.photo_comments;
CREATE POLICY "Users can add comments"
ON public.photo_comments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.progress_photos pp
    WHERE pp.id = photo_comments.photo_id
      AND (pp.is_public = true OR pp.user_id = auth.uid())
      AND NOT public.is_blocked_with(pp.user_id)
  )
);

DROP POLICY IF EXISTS "View comments on accessible photos" ON public.photo_comments;
CREATE POLICY "View comments on accessible photos"
ON public.photo_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.progress_photos pp
    WHERE pp.id = photo_comments.photo_id
      AND (pp.is_public = true OR pp.user_id = auth.uid())
      AND NOT public.is_blocked_with(pp.user_id)
  )
  AND NOT public.is_blocked_with(photo_comments.user_id)
);

-- photo_likes
DROP POLICY IF EXISTS "Users can add likes" ON public.photo_likes;
CREATE POLICY "Users can add likes"
ON public.photo_likes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.progress_photos pp
    WHERE pp.id = photo_likes.photo_id
      AND (pp.is_public = true OR pp.user_id = auth.uid())
      AND NOT public.is_blocked_with(pp.user_id)
  )
);

DROP POLICY IF EXISTS "View likes on accessible photos" ON public.photo_likes;
CREATE POLICY "View likes on accessible photos"
ON public.photo_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.progress_photos pp
    WHERE pp.id = photo_likes.photo_id
      AND (pp.is_public = true OR pp.user_id = auth.uid())
      AND NOT public.is_blocked_with(pp.user_id)
  )
  AND NOT public.is_blocked_with(photo_likes.user_id)
);

-- progress_photos: hide public photos between blocked pairs
DROP POLICY IF EXISTS "Users can view public photos" ON public.progress_photos;
CREATE POLICY "Users can view public photos"
ON public.progress_photos FOR SELECT
USING (is_public = true AND NOT public.is_blocked_with(user_id));

-- 2) Internal email queue functions must not be callable from the Data API
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO postgres, service_role;