-- User-customizable daily targets (water, sleep)
CREATE TABLE IF NOT EXISTS public.user_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  water_liters NUMERIC NOT NULL DEFAULT 2,
  sleep_hours NUMERIC NOT NULL DEFAULT 7,
  training_days_per_week INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own targets" ON public.user_targets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own targets" ON public.user_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own targets" ON public.user_targets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_targets_updated_at
  BEFORE UPDATE ON public.user_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();