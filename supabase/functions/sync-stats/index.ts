import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000];
const LEAGUES = [
  { id: 'bronze', minXp: 0 },
  { id: 'silver', minXp: 500 },
  { id: 'gold', minXp: 1500 },
  { id: 'platinum', minXp: 3500 },
  { id: 'diamond', minXp: 7000 },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing auth' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const clientStreak = Math.max(0, Math.min(Number(body.streak ?? 0) || 0, 3650));
    const seasonNumber = Math.max(1, Math.floor(Number(body.season_number ?? 0)) || 0);

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = user.id;

    // Authoritative count from task_completions
    const { count: completionsCount, error: countErr } = await admin
      .from('task_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (countErr) {
      console.error('sync-stats: count failed', countErr);
      return json({ error: 'Failed to compute stats' }, 500);
    }
    const total = completionsCount ?? 0;

    // Cap streak to plausible value relative to completions
    const streak = Math.min(clientStreak, total);

    const xp = total * 10 + streak * 5;
    let level = 1;
    for (let i = 1; i < LEVEL_XP.length; i++) {
      if (xp >= LEVEL_XP[i]) level = i + 1;
      else break;
    }

    // Preserve existing longest_streak
    const { data: existing } = await admin
      .from('user_stats')
      .select('longest_streak')
      .eq('user_id', userId)
      .maybeSingle();
    const longest = Math.max(existing?.longest_streak ?? 0, streak);

    const { error: upsertErr } = await admin
      .from('user_stats')
      .upsert({
        user_id: userId,
        xp,
        level,
        current_streak: streak,
        longest_streak: longest,
        total_tasks_completed: total,
      }, { onConflict: 'user_id' });
    if (upsertErr) {
      console.error('sync-stats: user_stats upsert failed', upsertErr);
      return json({ error: 'Failed to save stats' }, 500);
    }

    // Optionally upsert season row
    if (seasonNumber > 0) {
      const league = LEAGUES.slice().reverse().find(l => xp >= l.minXp)?.id || 'bronze';
      const { error: seasonErr } = await admin
        .from('user_seasons')
        .upsert({
          user_id: userId,
          season_number: seasonNumber,
          league,
          season_xp: xp,
        }, { onConflict: 'user_id,season_number' });
      if (seasonErr) {
        console.error('sync-stats: user_seasons upsert failed', seasonErr);
      }
    }

    return json({
      success: true,
      stats: { xp, level, current_streak: streak, longest_streak: longest, total_tasks_completed: total },
    });
  } catch (e) {
    console.error('sync-stats: unhandled', e);
    return json({ error: 'An internal error occurred' }, 500);
  }
});
