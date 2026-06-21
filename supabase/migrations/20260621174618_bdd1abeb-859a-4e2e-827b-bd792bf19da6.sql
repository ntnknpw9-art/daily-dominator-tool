
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_users_val int;
  active_subs_val int;
  dau int;
  wau int;
  mau int;
  signups_30d int;
  retained_d7 int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO total_users_val FROM auth.users;
  SELECT COUNT(*) INTO active_subs_val FROM public.user_subscriptions
    WHERE is_premium = true AND (expires_at IS NULL OR expires_at > now());

  SELECT COUNT(DISTINCT user_id) INTO dau FROM public.task_completions
    WHERE created_at > now() - interval '24 hours';
  SELECT COUNT(DISTINCT user_id) INTO wau FROM public.task_completions
    WHERE created_at > now() - interval '7 days';
  SELECT COUNT(DISTINCT user_id) INTO mau FROM public.task_completions
    WHERE created_at > now() - interval '30 days';

  -- D7 retention: of users who signed up 7-30 days ago, how many had activity in the last 7 days
  SELECT COUNT(*) INTO signups_30d FROM auth.users
    WHERE created_at BETWEEN now() - interval '30 days' AND now() - interval '7 days';
  SELECT COUNT(DISTINCT u.id) INTO retained_d7 FROM auth.users u
    WHERE u.created_at BETWEEN now() - interval '30 days' AND now() - interval '7 days'
      AND EXISTS (
        SELECT 1 FROM public.task_completions tc
        WHERE tc.user_id = u.id AND tc.created_at > now() - interval '7 days'
      );

  SELECT jsonb_build_object(
    'total_users', total_users_val,
    'users_last_24h', (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '24 hours'),
    'users_last_7d',  (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'users_last_30d', (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'verified_users', (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),

    'active_subscriptions', active_subs_val,
    'total_subscriptions', (SELECT COUNT(*) FROM public.user_subscriptions WHERE is_premium = true),
    'conversion_rate', CASE WHEN total_users_val > 0 THEN ROUND((active_subs_val::numeric / total_users_val) * 100, 2) ELSE 0 END,

    'dau', dau,
    'wau', wau,
    'mau', mau,
    'stickiness', CASE WHEN mau > 0 THEN ROUND((dau::numeric / mau) * 100, 1) ELSE 0 END,
    'retention_d7_pct', CASE WHEN signups_30d > 0 THEN ROUND((retained_d7::numeric / signups_30d) * 100, 1) ELSE 0 END,

    'total_tasks', (SELECT COUNT(*) FROM public.tasks),
    'total_completions', (SELECT COUNT(*) FROM public.task_completions WHERE completed = true),
    'completions_last_24h', (SELECT COUNT(*) FROM public.task_completions WHERE completed = true AND created_at > now() - interval '24 hours'),
    'completions_last_7d',  (SELECT COUNT(*) FROM public.task_completions WHERE completed = true AND created_at > now() - interval '7 days'),
    'completions_last_30d', (SELECT COUNT(*) FROM public.task_completions WHERE completed = true AND created_at > now() - interval '30 days'),
    'avg_completions_per_user', CASE WHEN total_users_val > 0 THEN ROUND(((SELECT COUNT(*) FROM public.task_completions WHERE completed=true)::numeric / total_users_val), 2) ELSE 0 END,

    'total_workouts', (SELECT COUNT(*) FROM public.workout_sessions),
    'workouts_last_7d', (SELECT COUNT(*) FROM public.workout_sessions WHERE created_at > now() - interval '7 days'),
    'total_workout_sets', (SELECT COUNT(*) FROM public.workout_sets),

    'total_journal_entries', (SELECT COUNT(*) FROM public.journal_entries),
    'journal_last_7d', (SELECT COUNT(*) FROM public.journal_entries WHERE created_at > now() - interval '7 days'),

    'total_progress_photos', (SELECT COUNT(*) FROM public.progress_photos),
    'photos_last_7d', (SELECT COUNT(*) FROM public.progress_photos WHERE created_at > now() - interval '7 days'),
    'total_photo_likes', (SELECT COUNT(*) FROM public.photo_likes),
    'total_photo_comments', (SELECT COUNT(*) FROM public.photo_comments),

    'total_ai_messages', (SELECT COUNT(*) FROM public.ai_chat_messages),
    'ai_messages_last_7d', (SELECT COUNT(*) FROM public.ai_chat_messages WHERE created_at > now() - interval '7 days'),

    'total_habits', (SELECT COUNT(*) FROM public.habits),
    'total_duels', (SELECT COUNT(*) FROM public.duels),
    'active_duels', (SELECT COUNT(*) FROM public.duels WHERE status = 'active'),
    'total_friendships', (SELECT COUNT(*) FROM public.friendships WHERE status = 'accepted'),
    'pending_friendships', (SELECT COUNT(*) FROM public.friendships WHERE status = 'pending'),
    'total_nutrition_logs', (SELECT COUNT(*) FROM public.nutrition_logs),
    'total_health_logs', (SELECT COUNT(*) FROM public.daily_health_logs),
    'total_challenges', (SELECT COUNT(*) FROM public.challenges),

    'avg_xp', (SELECT COALESCE(ROUND(AVG(xp)::numeric, 0), 0) FROM public.user_stats),
    'max_xp', (SELECT COALESCE(MAX(xp), 0) FROM public.user_stats),
    'avg_level', (SELECT COALESCE(ROUND(AVG(level)::numeric, 2), 0) FROM public.user_stats),
    'max_level', (SELECT COALESCE(MAX(level), 0) FROM public.user_stats),
    'avg_streak', (SELECT COALESCE(ROUND(AVG(current_streak)::numeric, 1), 0) FROM public.user_stats),
    'max_streak', (SELECT COALESCE(MAX(longest_streak), 0) FROM public.user_stats),

    'active_users_7d', wau,
    'active_users_30d', mau,

    'leagues', (
      SELECT COALESCE(jsonb_object_agg(league, cnt), '{}'::jsonb)
      FROM (
        SELECT league, COUNT(*) AS cnt
        FROM public.user_seasons
        WHERE season_end > now()
        GROUP BY league
      ) l
    ),
    'categories', (
      SELECT COALESCE(jsonb_object_agg(category, cnt), '{}'::jsonb)
      FROM (
        SELECT COALESCE(category, 'אחר') AS category, COUNT(*) AS cnt
        FROM public.tasks
        GROUP BY category
        ORDER BY cnt DESC
        LIMIT 10
      ) c
    ),
    'completions_by_hour', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('hour', h, 'count', cnt) ORDER BY h), '[]'::jsonb)
      FROM (
        SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Asia/Jerusalem'))::int AS h,
               COUNT(*) AS cnt
        FROM public.task_completions
        WHERE completed = true AND created_at > now() - interval '14 days'
        GROUP BY h
      ) hh
    ),
    'completions_by_dow', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('dow', d, 'count', cnt) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Jerusalem'))::int AS d,
               COUNT(*) AS cnt
        FROM public.task_completions
        WHERE completed = true AND created_at > now() - interval '30 days'
        GROUP BY d
      ) dd
    )
  ) INTO result;

  RETURN result;
END;
$$;
