
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID,
  day_name TEXT,
  focus TEXT,
  session_date TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_volume NUMERIC DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.workout_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.workout_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.workout_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_workout_sessions_user_date ON public.workout_sessions(user_id, session_date DESC);

CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_order INTEGER NOT NULL DEFAULT 0,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight NUMERIC,
  rir INTEGER,
  weighted BOOLEAN NOT NULL DEFAULT false,
  reps_target_min INTEGER,
  reps_target_max INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sets" ON public.workout_sets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sets" ON public.workout_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sets" ON public.workout_sets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sets" ON public.workout_sets
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_workout_sets_session ON public.workout_sets(session_id);
CREATE INDEX idx_workout_sets_user_exercise ON public.workout_sets(user_id, exercise_name, created_at DESC);
