
-- Severity & source enums
DO $$ BEGIN
  CREATE TYPE public.error_severity AS ENUM ('debug','info','warn','error','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.error_source AS ENUM ('client','server','network','auth','db','payment','ai','edge_function','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.app_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  severity public.error_severity NOT NULL DEFAULT 'error',
  source public.error_source NOT NULL DEFAULT 'client',
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  context JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_errors_created_at_idx ON public.app_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS app_errors_severity_idx ON public.app_errors (severity);
CREATE INDEX IF NOT EXISTS app_errors_source_idx ON public.app_errors (source);
CREATE INDEX IF NOT EXISTS app_errors_resolved_idx ON public.app_errors (resolved);

GRANT INSERT ON public.app_errors TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.app_errors TO authenticated;
GRANT ALL ON public.app_errors TO service_role;

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can log errors — message+severity+source only, body is sanitized client-side.
CREATE POLICY "anyone can insert error reports"
  ON public.app_errors FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "admins can view all errors"
  ON public.app_errors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update (mark as resolved)
CREATE POLICY "admins can update errors"
  ON public.app_errors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "admins can delete errors"
  ON public.app_errors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Summary RPC
CREATE OR REPLACE FUNCTION public.admin_get_errors_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM public.app_errors),
    'unresolved', (SELECT COUNT(*) FROM public.app_errors WHERE resolved = false),
    'last_24h', (SELECT COUNT(*) FROM public.app_errors WHERE created_at > now() - interval '24 hours'),
    'last_7d',  (SELECT COUNT(*) FROM public.app_errors WHERE created_at > now() - interval '7 days'),
    'critical_open', (SELECT COUNT(*) FROM public.app_errors WHERE severity = 'critical' AND resolved = false),
    'by_severity', (
      SELECT COALESCE(jsonb_object_agg(severity, cnt), '{}'::jsonb)
      FROM (SELECT severity::text, COUNT(*) AS cnt FROM public.app_errors GROUP BY severity) s
    ),
    'by_source', (
      SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb)
      FROM (SELECT source::text, COUNT(*) AS cnt FROM public.app_errors GROUP BY source) s
    ),
    'top_messages', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('message', message, 'count', cnt, 'severity', severity, 'last_seen', last_seen) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT LEFT(message, 200) AS message, severity::text, COUNT(*) AS cnt, MAX(created_at) AS last_seen
        FROM public.app_errors
        WHERE created_at > now() - interval '30 days'
        GROUP BY LEFT(message, 200), severity
        ORDER BY cnt DESC
        LIMIT 15
      ) t
    ),
    'errors_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'count', cnt) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT d::date AS day, COUNT(e.id) AS cnt
        FROM generate_series(now()::date - interval '13 days', now()::date, interval '1 day') d
        LEFT JOIN public.app_errors e ON e.created_at::date = d::date
        GROUP BY d
      ) x
    )
  ) INTO result;

  RETURN result;
END;
$fn$;

-- List recent errors with optional severity filter
CREATE OR REPLACE FUNCTION public.admin_list_errors(
  _limit INT DEFAULT 100,
  _severity TEXT DEFAULT NULL,
  _only_unresolved BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  severity TEXT,
  source TEXT,
  message TEXT,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  context JSONB,
  resolved BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT e.id, e.user_id, e.severity::text, e.source::text, e.message, e.stack, e.url,
         e.user_agent, e.context, e.resolved, e.created_at
  FROM public.app_errors e
  WHERE (_severity IS NULL OR e.severity::text = _severity)
    AND (NOT _only_unresolved OR e.resolved = false)
  ORDER BY e.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 500);
END;
$fn$;
