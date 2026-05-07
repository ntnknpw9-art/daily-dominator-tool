
DROP POLICY IF EXISTS "Anyone authenticated can view comments" ON public.photo_comments;
CREATE POLICY "View comments on accessible photos"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.progress_photos pp
    WHERE pp.id = photo_comments.photo_id
      AND (pp.is_public = true OR pp.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Anyone authenticated can view likes" ON public.photo_likes;
CREATE POLICY "View likes on accessible photos"
ON public.photo_likes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.progress_photos pp
    WHERE pp.id = photo_likes.photo_id
      AND (pp.is_public = true OR pp.user_id = auth.uid())
  )
);

-- Lock down user_stats inserts: only allow row creation with zeroed values
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
CREATE POLICY "Users can create their own zeroed stats"
ON public.user_stats FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(xp, 0) = 0
  AND COALESCE(level, 1) = 1
  AND COALESCE(current_streak, 0) = 0
  AND COALESCE(longest_streak, 0) = 0
  AND COALESCE(total_tasks_completed, 0) = 0
);

DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;

-- Lock down user_seasons inserts: only allow row creation with zeroed values
DROP POLICY IF EXISTS "Users can insert their own season" ON public.user_seasons;
DROP POLICY IF EXISTS "Users can insert their own seasons" ON public.user_seasons;
CREATE POLICY "Users can create their own zeroed season"
ON public.user_seasons FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(season_xp, 0) = 0
  AND COALESCE(season_rank, 0) = 0
);

DROP POLICY IF EXISTS "Users can update their own season" ON public.user_seasons;
DROP POLICY IF EXISTS "Users can update their own seasons" ON public.user_seasons;
