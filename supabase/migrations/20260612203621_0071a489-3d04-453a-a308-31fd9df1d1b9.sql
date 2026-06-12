-- Lock down direct client updates to leaderboard-related fields
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Update own stats" ON public.user_stats;

DROP POLICY IF EXISTS "Users can update their own season" ON public.user_seasons;
DROP POLICY IF EXISTS "Users can update own season" ON public.user_seasons;
DROP POLICY IF EXISTS "Update own season" ON public.user_seasons;

-- Only service_role (server-side: triggers / edge functions) may write these tables now.
-- SELECT policies remain unchanged so users still see their own data.