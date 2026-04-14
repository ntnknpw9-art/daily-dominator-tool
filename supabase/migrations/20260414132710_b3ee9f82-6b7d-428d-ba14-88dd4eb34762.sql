
-- Allow all authenticated users to view all user_stats for leaderboard
CREATE POLICY "Authenticated users can view all stats for leaderboard"
ON public.user_stats
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to view all profiles for leaderboard
CREATE POLICY "Authenticated users can view all profiles for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
