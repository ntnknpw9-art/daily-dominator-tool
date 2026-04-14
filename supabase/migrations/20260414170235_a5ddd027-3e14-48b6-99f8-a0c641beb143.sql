
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can accept/update friendships they received"
ON public.friendships FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE INDEX idx_friendships_sender ON public.friendships(sender_id);
CREATE INDEX idx_friendships_receiver ON public.friendships(receiver_id);

-- Seasons table for league system
CREATE TABLE public.user_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  season_number INTEGER NOT NULL DEFAULT 1,
  league TEXT NOT NULL DEFAULT 'bronze' CHECK (league IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  season_xp INTEGER NOT NULL DEFAULT 0,
  season_rank INTEGER,
  season_start DATE NOT NULL DEFAULT CURRENT_DATE,
  season_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_number)
);

ALTER TABLE public.user_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all seasons for leaderboard"
ON public.user_seasons FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert their own season"
ON public.user_seasons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own season"
ON public.user_seasons FOR UPDATE
USING (auth.uid() = user_id);
