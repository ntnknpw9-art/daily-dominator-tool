ALTER TABLE public.daily_health_logs
ADD COLUMN active_calories INTEGER DEFAULT 0,
ADD COLUMN exercise_minutes INTEGER DEFAULT 0;