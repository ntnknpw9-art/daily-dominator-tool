
-- 1. Enum + roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Create the admin auth user (idempotent)
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'ntnknpw150@gmail.com';

  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uid, 'authenticated', 'authenticated',
      'ntnknpw150@gmail.com',
      crypt(gen_random_uuid()::text, gen_salt('bf')) -- placeholder: set the real admin password out-of-band,
      now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('display_name','מנהל'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'ntnknpw150@gmail.com', 'email_verified', true),
      'email', admin_uid::text,
      now(), now(), now()
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- 4. Aggregate stats function — admins only, returns numbers only (no personal data)
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
    'active_subscriptions', (SELECT COUNT(*) FROM public.user_subscriptions WHERE status = 'active'),
    'total_subscriptions', (SELECT COUNT(*) FROM public.user_subscriptions),
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

-- 5. Daily signups time-series for graph (last 30 days)
CREATE OR REPLACE FUNCTION public.admin_get_signups_daily()
RETURNS TABLE(day date, signups bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT d::date AS day,
         COALESCE(COUNT(u.id), 0) AS signups
  FROM generate_series(now()::date - interval '29 days', now()::date, interval '1 day') d
  LEFT JOIN auth.users u ON u.created_at::date = d::date
  GROUP BY d
  ORDER BY d;
END;
$$;

-- 6. Daily activity time-series (completions per day, last 30 days)
CREATE OR REPLACE FUNCTION public.admin_get_activity_daily()
RETURNS TABLE(day date, completions bigint, active_users bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT d::date AS day,
         COALESCE(COUNT(tc.id) FILTER (WHERE tc.completed = true), 0) AS completions,
         COALESCE(COUNT(DISTINCT tc.user_id) FILTER (WHERE tc.completed = true), 0) AS active_users
  FROM generate_series(now()::date - interval '29 days', now()::date, interval '1 day') d
  LEFT JOIN public.task_completions tc ON tc.created_at::date = d::date
  GROUP BY d
  ORDER BY d;
END;
$$;
