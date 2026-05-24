-- Keep only one spin per user/day before adding uniqueness protection
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, spin_date ORDER BY created_at ASC, id ASC) AS rn
  FROM public.daily_spins
)
DELETE FROM public.daily_spins d
USING ranked r
WHERE d.id = r.id
  AND r.rn > 1;

-- Prevent duplicate daily spins even if requests race
CREATE UNIQUE INDEX IF NOT EXISTS daily_spins_one_per_user_per_day_idx
ON public.daily_spins (user_id, spin_date);

-- Remove direct client-side prize creation
DROP POLICY IF EXISTS "Users can create spins" ON public.daily_spins;

-- Only trusted backend code can record the server-drawn prize
CREATE POLICY "Service role can create spins"
ON public.daily_spins
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role'::text);