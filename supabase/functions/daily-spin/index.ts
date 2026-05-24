import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRIZES = [
  { label: "XP x2", type: "xp_double", value: 2, emoji: "⚡" },
  { label: "+50 XP", type: "xp_bonus", value: 50, emoji: "✨" },
  { label: "דילוג עונש", type: "skip_punishment", value: 1, emoji: "🛡️" },
  { label: "+100 XP", type: "xp_bonus", value: 100, emoji: "🔥" },
  { label: "תג מיוחד", type: "special_badge", value: 1, emoji: "👑" },
  { label: "+25 XP", type: "xp_bonus", value: 25, emoji: "💎" },
  { label: "סטריק בוסט", type: "streak_boost", value: 1, emoji: "🔥" },
  { label: "+75 XP", type: "xp_bonus", value: 75, emoji: "⭐" },
] as const;

function jerusalemDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function securePrizeIndex() {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return random[0] % PRIZES.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await requireUser(req);
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const spinDate = jerusalemDate();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: existing, error: existingError } = await admin
    .from("daily_spins")
    .select("prize_type, prize_value, spin_date")
    .eq("user_id", auth.user.id)
    .eq("spin_date", spinDate)
    .maybeSingle();

  if (existingError) {
    return new Response(JSON.stringify({ error: "Could not check spin status" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existing) {
    const prizeIndex = PRIZES.findIndex(
      (p) => p.type === existing.prize_type && p.value === existing.prize_value,
    );
    return new Response(JSON.stringify({
      alreadySpun: true,
      spinDate,
      prizeIndex: Math.max(prizeIndex, 0),
      prize: PRIZES[Math.max(prizeIndex, 0)],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const prizeIndex = securePrizeIndex();
  const prize = PRIZES[prizeIndex];
  const { error: insertError } = await admin.from("daily_spins").insert({
    user_id: auth.user.id,
    spin_date: spinDate,
    prize_type: prize.type,
    prize_value: prize.value,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: "Spin already used today" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ alreadySpun: false, spinDate, prizeIndex, prize }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});