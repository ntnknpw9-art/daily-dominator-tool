CREATE TABLE public.applied_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan JSONB NOT NULL,
  summary TEXT,
  applied_targets BOOLEAN NOT NULL DEFAULT false,
  applied_nutrition BOOLEAN NOT NULL DEFAULT false,
  applied_training BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.applied_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applied plans" ON public.applied_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own applied plans" ON public.applied_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own applied plans" ON public.applied_plans FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_applied_plans_user_date ON public.applied_plans(user_id, created_at DESC);