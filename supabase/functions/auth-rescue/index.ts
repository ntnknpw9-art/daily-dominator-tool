// Auth rescue: auto-confirms legacy unconfirmed accounts so users who signed up
// when email confirmation was enabled can log in without a verification code.
// Flow:
// 1. Try a normal signInWithPassword with the provided credentials.
// 2. If it succeeds — already confirmed, just return ok.
// 3. If it fails with "Email not confirmed" — use admin API to flip
//    email_confirm=true for that user, then the client can sign in again.
// 4. Any other failure (wrong password, no user) → forwarded as error.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return json({ error: "missing_credentials" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Probe with a regular client — does the password match?
    const probe = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInError } =
      await probe.auth.signInWithPassword({ email, password });

    if (!signInError && signInData?.user) {
      // Already valid — nothing to rescue.
      return json({ status: "ok", rescued: false });
    }

    const msg = (signInError?.message || "").toLowerCase();
    const isUnconfirmed =
      msg.includes("not confirmed") ||
      msg.includes("email not confirmed") ||
      msg.includes("email_not_confirmed");

    if (!isUnconfirmed) {
      // Wrong password / no user / other → bubble up untouched.
      return json({ error: "invalid_credentials" }, 400);
    }

    // 2. Password is correct but the account is unconfirmed → confirm it.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Find the user by email (paginate defensively, usually first page is enough).
    let target: { id: string; email?: string | null } | null = null;
    for (let page = 1; page <= 5 && !target; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) {
        console.error("auth-rescue listUsers failed:", error.message);
      return json({ error: "internal_error" }, 500);
      }
      target =
        data.users.find(
          (u) => (u.email || "").toLowerCase() === String(email).toLowerCase(),
        ) || null;
      if (data.users.length < 200) break;
    }

    if (!target) {
      return json({ error: "user_not_found" }, 404);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(target.id, {
      email_confirm: true,
    });
    if (updateError) {
      console.error("auth-rescue update failed:", updateError.message);
      return json({ error: "internal_error" }, 500);
    }

    return json({ status: "ok", rescued: true });
  } catch (e) {
    console.error("auth-rescue unexpected error:", e);
    return json({ error: "internal_error" }, 500);
  }
});
