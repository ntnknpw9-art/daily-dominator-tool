import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Every table that stores rows owned by a user account.
const OWNER_TABLES = [
  'ai_chat_messages', 'app_errors', 'applied_plans', 'challenges', 'daily_health_logs',
  'daily_spins', 'eula_acceptances', 'habits', 'journal_entries', 'nutrition_logs',
  'nutrition_profiles', 'photo_comments', 'photo_likes', 'progress_photos',
  'task_completions', 'tasks', 'user_achievements', 'user_blocks', 'user_roles',
  'user_seasons', 'user_stats', 'user_subscriptions', 'user_targets',
  'workout_sessions', 'workout_sets', 'profiles',
];

const json = (body: unknown, status: number) =>
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

    // Verify the caller with the auth server, not just the local token.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = user.id;

    // Best-effort data removal: a single failing table must not leave the
    // account undeletable. Failures are logged and the account is still removed.
    const failed: string[] = [];
    for (const t of OWNER_TABLES) {
      const { error } = await admin.from(t).delete().eq('user_id', userId);
      if (error) failed.push(`${t}: ${error.message}`);
    }

    // Relationship tables that name the user in two columns.
    const rels: Array<[string, string, string]> = [
      ['friendships', 'sender_id', 'receiver_id'],
      ['duels', 'challenger_id', 'opponent_id'],
    ];
    for (const [table, a, b] of rels) {
      const { error } = await admin.from(table)
        .delete()
        .or(`${a}.eq.${userId},${b}.eq.${userId}`);
      if (error) failed.push(`${table}: ${error.message}`);
    }

    // Private files the user uploaded (folder per user id).
    try {
      const prefix = `${userId}/`;
      let offset = 0;
      for (;;) {
        const { data: files, error: listErr } = await admin.storage
          .from('progress-photos')
          .list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
        if (listErr || !files || files.length === 0) break;
        const paths = files.map((f) => `${prefix}${f.name}`);
        const { error: rmErr } = await admin.storage.from('progress-photos').remove(paths);
        if (rmErr) failed.push(`storage: ${rmErr.message}`);
        if (files.length < 1000) break;
        offset += 1000;
      }
    } catch (e) {
      failed.push(`storage: ${String(e)}`);
    }

    if (failed.length) console.error('delete-account: partial cleanup', failed);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('delete-account: auth admin deleteUser failed', delErr);
      return json({ error: 'Failed to delete account' }, 500);
    }

    return json({ success: true, cleaned: failed.length === 0 }, 200);
  } catch (e) {
    console.error('delete-account: unhandled error', e);
    return json({ error: 'An internal error occurred. Please try again.' }, 500);
  }
});
