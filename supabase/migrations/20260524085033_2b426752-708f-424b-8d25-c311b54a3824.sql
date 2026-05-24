
-- 1) user_subscriptions: remove client INSERT/UPDATE
DROP POLICY IF EXISTS "Users insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users update own subscription" ON public.user_subscriptions;

-- 2) duels: prevent score/winner manipulation via trigger
CREATE OR REPLACE FUNCTION public.enforce_duel_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Immutable fields for participants
  IF NEW.challenger_id IS DISTINCT FROM OLD.challenger_id
     OR NEW.opponent_id IS DISTINCT FROM OLD.opponent_id
     OR NEW.start_date  IS DISTINCT FROM OLD.start_date
     OR NEW.end_date    IS DISTINCT FROM OLD.end_date
     OR NEW.winner_id   IS DISTINCT FROM OLD.winner_id
     OR NEW.status      IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not allowed to modify duel meta fields';
  END IF;

  IF auth.uid() = OLD.challenger_id THEN
    IF NEW.opponent_score IS DISTINCT FROM OLD.opponent_score THEN
      RAISE EXCEPTION 'Challenger can only update own score';
    END IF;
  ELSIF auth.uid() = OLD.opponent_id THEN
    IF NEW.challenger_score IS DISTINCT FROM OLD.challenger_score THEN
      RAISE EXCEPTION 'Opponent can only update own score';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not a participant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_duel_update_rules ON public.duels;
CREATE TRIGGER enforce_duel_update_rules
BEFORE UPDATE ON public.duels
FOR EACH ROW EXECUTE FUNCTION public.enforce_duel_update_rules();

-- 3) DELETE policies for cleanup
CREATE POLICY "Service role can delete unsubscribe tokens"
  ON public.email_unsubscribe_tokens FOR DELETE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete suppressed emails"
  ON public.suppressed_emails FOR DELETE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can update suppressed emails"
  ON public.suppressed_emails FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4) Lock down SECURITY DEFINER queue helpers + pin search_path
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- 5) Stop listing of email-assets public bucket (public URLs still work)
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;
