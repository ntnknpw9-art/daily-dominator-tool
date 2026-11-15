-- Remove open "anyone signed in can read everything" rules
DROP POLICY IF EXISTS "Authenticated users can view all stats for leaderboard" ON public.user_stats;
DROP POLICY IF EXISTS "Users can view all seasons for leaderboard" ON public.user_seasons;
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;

-- Helper: are the current user and _other connected by a friendship (pending or accepted)?
CREATE OR REPLACE FUNCTION public.is_friend_of(_other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.sender_id = auth.uid() AND f.receiver_id = _other)
       OR (f.receiver_id = auth.uid() AND f.sender_id = _other)
  )
$$;
REVOKE ALL ON FUNCTION public.is_friend_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_friend_of(uuid) TO authenticated;

-- Own row stays readable (existing policies); friends can also see each other
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Friends can view stats" ON public.user_stats;
CREATE POLICY "Friends can view stats" ON public.user_stats
  FOR SELECT TO authenticated USING (public.is_friend_of(user_id));

DROP POLICY IF EXISTS "Users can view own seasons" ON public.user_seasons;
CREATE POLICY "Users can view own seasons" ON public.user_seasons
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Friends can view profiles" ON public.profiles;
CREATE POLICY "Friends can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_friend_of(user_id));

-- Global ranking: names and scores only
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (user_id uuid, display_name text, xp integer, level integer,
               current_streak integer, longest_streak integer, total_tasks_completed integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.user_id, COALESCE(p.display_name, 'משתמש'), s.xp, s.level,
         s.current_streak, s.longest_streak, s.total_tasks_completed
  FROM public.user_stats s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY s.xp DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

-- Season ranking: names, season XP and league only
CREATE OR REPLACE FUNCTION public.get_season_leaderboard(_season integer)
RETURNS TABLE (user_id uuid, display_name text, season_xp integer, league text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT us.user_id, COALESCE(p.display_name, 'משתמש'), us.season_xp, us.league
  FROM public.user_seasons us
  LEFT JOIN public.profiles p ON p.user_id = us.user_id
  WHERE auth.uid() IS NOT NULL AND us.season_number = _season
  ORDER BY us.season_xp DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.get_season_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_season_leaderboard(integer) TO authenticated;

-- Friend search by display name: one match, never yourself, min 2 characters
CREATE OR REPLACE FUNCTION public.find_profile_by_name(_query text)
RETURNS TABLE (user_id uuid, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.display_name
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND length(trim(_query)) >= 2
    AND p.user_id <> auth.uid()
    AND p.display_name ILIKE '%' || replace(replace(replace(trim(_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  ORDER BY (lower(p.display_name) = lower(trim(_query))) DESC, p.display_name
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_profile_by_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_by_name(text) TO authenticated;