import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = user.id;

    // Delete user data from all tables
    const tables = [
      'ai_chat_messages', 'challenges', 'daily_spins', 'habits', 'journal_entries',
      'nutrition_logs', 'nutrition_profiles', 'photo_comments', 'photo_likes',
      'progress_photos', 'task_completions', 'tasks', 'user_achievements',
      'user_seasons', 'user_stats', 'profiles',
    ];
    for (const t of tables) {
      await admin.from(t).delete().eq('user_id', userId);
    }
    await admin.from('friendships').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await admin.from('duels').delete().or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('delete-account: auth admin deleteUser failed', delErr);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('delete-account: unhandled error', e);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
