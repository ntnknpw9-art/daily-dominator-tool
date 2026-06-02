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

  IF auth.uid() <> OLD.challenger_id AND auth.uid() <> OLD.opponent_id THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Scores are authoritative server-side state computed from task_completions.
  -- Participants must never set them directly — previously a participant could
  -- inflate their own score to any integer. Force the score columns to their
  -- existing values for any non-service-role update.
  NEW.challenger_score := OLD.challenger_score;
  NEW.opponent_score   := OLD.opponent_score;

  RETURN NEW;
END;
$$;