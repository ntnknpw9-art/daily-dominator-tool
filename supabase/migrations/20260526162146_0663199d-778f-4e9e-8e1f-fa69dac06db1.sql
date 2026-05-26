
CREATE OR REPLACE FUNCTION public.enforce_user_seasons_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_xp INT;
  computed_league TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Not allowed to modify another user''s season';
  END IF;

  -- Pull verified XP from user_stats (which itself has an integrity trigger)
  SELECT COALESCE(xp, 0) INTO real_xp
  FROM public.user_stats
  WHERE user_id = NEW.user_id;

  IF real_xp IS NULL THEN
    real_xp := 0;
  END IF;

  -- Compute league from season_xp tiers
  IF real_xp >= 5000 THEN
    computed_league := 'diamond';
  ELSIF real_xp >= 2000 THEN
    computed_league := 'platinum';
  ELSIF real_xp >= 1000 THEN
    computed_league := 'gold';
  ELSIF real_xp >= 300 THEN
    computed_league := 'silver';
  ELSE
    computed_league := 'bronze';
  END IF;

  -- Lock down fields clients should not be able to forge
  NEW.season_xp := real_xp;
  NEW.league := computed_league;
  NEW.user_id := OLD.user_id;
  NEW.season_number := OLD.season_number;
  NEW.season_start := OLD.season_start;
  NEW.season_end := OLD.season_end;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_seasons_integrity_trigger ON public.user_seasons;
CREATE TRIGGER enforce_user_seasons_integrity_trigger
BEFORE UPDATE ON public.user_seasons
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_seasons_integrity();

-- Also enforce on INSERT so initial values cannot be inflated
CREATE OR REPLACE FUNCTION public.enforce_user_seasons_insert_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_xp INT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Not allowed to create season for another user';
  END IF;

  SELECT COALESCE(xp, 0) INTO real_xp
  FROM public.user_stats
  WHERE user_id = NEW.user_id;

  IF real_xp IS NULL THEN
    real_xp := 0;
  END IF;

  NEW.season_xp := LEAST(COALESCE(NEW.season_xp, 0), real_xp);
  IF NEW.season_xp < 0 THEN
    NEW.season_xp := 0;
  END IF;
  NEW.league := COALESCE(NEW.league, 'bronze');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_seasons_insert_integrity_trigger ON public.user_seasons;
CREATE TRIGGER enforce_user_seasons_insert_integrity_trigger
BEFORE INSERT ON public.user_seasons
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_seasons_insert_integrity();
