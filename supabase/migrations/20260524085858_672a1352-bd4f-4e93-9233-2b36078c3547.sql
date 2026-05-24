
CREATE OR REPLACE FUNCTION public.enforce_user_stats_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_total INT;
  real_streak INT := 0;
  d DATE;
  today DATE := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  computed_xp INT;
  computed_level INT;
  level_thresholds INT[] := ARRAY[0,100,250,500,1000,2000,3500,5500,8000,12000,20000];
  i INT;
BEGIN
  -- Service role bypasses
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Only the owner may write
  IF auth.uid() IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Not allowed to modify another user''s stats';
  END IF;

  -- Recompute total completions from source of truth
  SELECT COUNT(*) INTO real_total
  FROM public.task_completions
  WHERE user_id = NEW.user_id AND completed = true;

  -- Recompute current streak: consecutive days ending today (or yesterday) with at least one completion
  d := today;
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.task_completions
      WHERE user_id = NEW.user_id AND completed = true AND completion_date = to_char(d, 'YYYY-MM-DD')
    ) THEN
      real_streak := real_streak + 1;
      d := d - 1;
    ELSE
      -- allow today to be empty if yesterday has data
      IF d = today AND real_streak = 0 THEN
        d := d - 1;
        IF EXISTS (
          SELECT 1 FROM public.task_completions
          WHERE user_id = NEW.user_id AND completed = true AND completion_date = to_char(d, 'YYYY-MM-DD')
        ) THEN
          real_streak := real_streak + 1;
          d := d - 1;
          CONTINUE;
        END IF;
      END IF;
      EXIT;
    END IF;
  END LOOP;

  computed_xp := real_total * 10 + real_streak * 5;

  computed_level := 1;
  FOR i IN 1..array_length(level_thresholds, 1) LOOP
    IF computed_xp >= level_thresholds[i] THEN
      computed_level := i;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  NEW.total_tasks_completed := real_total;
  NEW.current_streak := real_streak;
  NEW.xp := computed_xp;
  NEW.level := computed_level;
  NEW.longest_streak := GREATEST(COALESCE(OLD.longest_streak, 0), real_streak, COALESCE(NEW.longest_streak, 0));
  -- Cap longest_streak to not exceed total completion days
  NEW.longest_streak := LEAST(NEW.longest_streak, GREATEST(real_total, real_streak));
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_user_stats_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_user_stats_integrity_trg ON public.user_stats;
CREATE TRIGGER enforce_user_stats_integrity_trg
BEFORE INSERT OR UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_stats_integrity();
