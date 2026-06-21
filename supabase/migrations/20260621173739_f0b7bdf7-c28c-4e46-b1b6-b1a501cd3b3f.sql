
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'users_last_24h', (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '24 hours'),
    'users_last_7d', (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'users_last_30d', (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'active_subscriptions', (SELECT COUNT(*) FROM public.user_subscriptions WHERE is_premium = true AND (expires_at IS NULL OR expires_at > now())),
    'total_subscriptions', (SELECT COUNT(*) FROM public.user_subscriptions WHERE is_premium = true),
    'total_tasks', (SELECT COUNT(*) FROM public.tasks),
    'total_completions', (SELECT COUNT(*) FROM public.task_completions WHERE completed = true),
    'completions_last_7d', (SELECT COUNT(*) FROM public.task_completions WHERE completed = true AND created_at > now() - interval '7 days'),
    'total_workouts', (SELECT COUNT(*) FROM public.workout_sessions),
    'workouts_last_7d', (SELECT COUNT(*) FROM public.workout_sessions WHERE created_at > now() - interval '7 days'),
    'total_journal_entries', (SELECT COUNT(*) FROM public.journal_entries),
    'total_progress_photos', (SELECT COUNT(*) FROM public.progress_photos),
    'total_ai_messages', (SELECT COUNT(*) FROM public.ai_chat_messages),
    'active_users_7d', (SELECT COUNT(DISTINCT user_id) FROM public.task_completions WHERE created_at > now() - interval '7 days'),
    'active_users_30d', (SELECT COUNT(DISTINCT user_id) FROM public.task_completions WHERE created_at > now() - interval '30 days')
  ) INTO result;

  RETURN result;
END;
$$;
