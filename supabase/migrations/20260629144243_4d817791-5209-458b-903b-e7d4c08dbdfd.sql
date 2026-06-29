
-- 1. app_errors: restrict to authenticated, add size constraints
DROP POLICY IF EXISTS "anyone can insert error reports" ON public.app_errors;

ALTER TABLE public.app_errors
  ADD CONSTRAINT app_errors_message_len CHECK (char_length(message) <= 2000),
  ADD CONSTRAINT app_errors_stack_len   CHECK (stack IS NULL OR char_length(stack) <= 8000),
  ADD CONSTRAINT app_errors_url_len     CHECK (url IS NULL OR char_length(url) <= 1000),
  ADD CONSTRAINT app_errors_ua_len      CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  ADD CONSTRAINT app_errors_context_len CHECK (context IS NULL OR pg_column_size(context) <= 8000);

CREATE POLICY "Authenticated users can insert their own errors"
  ON public.app_errors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

REVOKE INSERT ON public.app_errors FROM anon;

-- 2. user_stats: remove client INSERT (provisioned server-side by sync-stats / triggers)
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;

-- 3. user_seasons: remove client INSERT (provisioned server-side by sync-stats)
DROP POLICY IF EXISTS "Users can insert their own season" ON public.user_seasons;

-- 4. user_achievements: remove client INSERT, replace with validated RPC
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
REVOKE INSERT ON public.user_achievements FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.claim_achievement(_achievement_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  s_xp int := 0; s_level int := 0; s_streak int := 0; s_longest int := 0; s_total int := 0;
  c_fit int := 0; c_study int := 0; c_money int := 0; c_disc int := 0; c_cats int := 0;
  c_perfect int := 0;
  ok boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(xp,0), COALESCE(level,0), COALESCE(current_streak,0),
         COALESCE(longest_streak,0), COALESCE(total_tasks_completed,0)
    INTO s_xp, s_level, s_streak, s_longest, s_total
    FROM public.user_stats WHERE user_id = uid;

  -- Category counts
  SELECT
    COUNT(*) FILTER (WHERE LOWER(COALESCE(t.category,'')) IN ('fitness','כושר')),
    COUNT(*) FILTER (WHERE LOWER(COALESCE(t.category,'')) IN ('study','לימודים','לימוד')),
    COUNT(*) FILTER (WHERE LOWER(COALESCE(t.category,'')) IN ('money','כסף')),
    COUNT(*) FILTER (WHERE LOWER(COALESCE(t.category,'')) IN ('discipline','משמעת')),
    COUNT(DISTINCT NULLIF(t.category,''))
    INTO c_fit, c_study, c_money, c_disc, c_cats
    FROM public.task_completions tc
    LEFT JOIN public.tasks t ON t.id = tc.task_id
    WHERE tc.user_id = uid AND tc.completed = true;

  -- Perfect days: days where the user completed >= number of tasks scheduled for that weekday and within the task's date range
  SELECT COUNT(*) FROM (
    SELECT tc.completion_date
    FROM public.task_completions tc
    WHERE tc.user_id = uid AND tc.completed = true
    GROUP BY tc.completion_date
    HAVING COUNT(*) >= GREATEST(1, (
      SELECT COUNT(*) FROM public.tasks t
      WHERE t.user_id = uid
        AND (t.start_date IS NULL OR t.start_date <= tc.completion_date)
        AND (t.end_date   IS NULL OR t.end_date   >= tc.completion_date)
    ))
  ) d INTO c_perfect;

  ok := CASE _achievement_id
    WHEN 'streak_3'   THEN s_streak >= 3
    WHEN 'streak_7'   THEN s_streak >= 7
    WHEN 'streak_14'  THEN s_streak >= 14
    WHEN 'streak_30'  THEN s_streak >= 30
    WHEN 'streak_100' THEN s_streak >= 100
    WHEN 'tasks_1'    THEN s_total >= 1
    WHEN 'tasks_10'   THEN s_total >= 10
    WHEN 'tasks_50'   THEN s_total >= 50
    WHEN 'tasks_100'  THEN s_total >= 100
    WHEN 'tasks_500'  THEN s_total >= 500
    WHEN 'tasks_1000' THEN s_total >= 1000
    WHEN 'fit_5'      THEN c_fit >= 5
    WHEN 'fit_20'     THEN c_fit >= 20
    WHEN 'fit_50'     THEN c_fit >= 50
    WHEN 'fit_100'    THEN c_fit >= 100
    WHEN 'study_5'    THEN c_study >= 5
    WHEN 'study_20'   THEN c_study >= 20
    WHEN 'study_50'   THEN c_study >= 50
    WHEN 'money_10'   THEN c_money >= 10
    WHEN 'money_30'   THEN c_money >= 30
    WHEN 'disc_perfect3'  THEN c_perfect >= 3
    WHEN 'disc_perfect7'  THEN c_perfect >= 7
    WHEN 'disc_perfect30' THEN c_perfect >= 30
    WHEN 'sp_level5'    THEN s_level >= 5
    WHEN 'sp_level10'   THEN s_level >= 10
    WHEN 'sp_allcats'   THEN c_cats >= 5
    WHEN 'sp_xp5000'    THEN s_xp >= 5000
    ELSE false
  END;

  IF NOT ok THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (uid, _achievement_id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_achievement(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_achievement(text) TO authenticated;

-- 5. Lock down SECURITY DEFINER functions
-- Admin functions: internally check has_role, so revoke anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.admin_list_errors(integer, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_errors_summary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_signups_daily() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_activity_daily() FROM PUBLIC, anon;

-- Helper used only inside RLS policies — not meant to be invoked directly
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- Email queue helpers: server-only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- Trigger functions: never called directly
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_user_stats_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_user_seasons_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_user_seasons_insert_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_duel_update_rules() FROM PUBLIC, anon, authenticated;
