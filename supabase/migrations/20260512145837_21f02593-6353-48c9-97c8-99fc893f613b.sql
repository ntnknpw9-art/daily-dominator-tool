CREATE TABLE public.daily_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    log_date TEXT NOT NULL,
    water_liters NUMERIC DEFAULT 0,
    steps INTEGER DEFAULT 0,
    screen_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, log_date)
);

ALTER TABLE public.daily_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own health logs"
ON public.daily_health_logs
FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_health_logs_updated_at
BEFORE UPDATE ON public.daily_health_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();