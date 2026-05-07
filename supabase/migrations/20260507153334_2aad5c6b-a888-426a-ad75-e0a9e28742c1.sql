
DROP POLICY IF EXISTS "Users can create their own zeroed stats" ON public.user_stats;
CREATE POLICY "Users can insert their own stats"
ON public.user_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own zeroed season" ON public.user_seasons;
CREATE POLICY "Users can insert their own season"
ON public.user_seasons FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own season"
ON public.user_seasons FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
