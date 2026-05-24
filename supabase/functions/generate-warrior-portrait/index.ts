import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pickRarity(streak: number, level: number, completionRate: number) {
  const score = streak * 2 + level * 3 + completionRate * 50;
  if (score >= 200) return { rarity: "mythic", label: "מיתי", color: "אש זהובה וסגולה זוהרת, הילה אלוהית" };
  if (score >= 120) return { rarity: "legendary", label: "אגדי", color: "הילת זהב, אש מסביב" };
  if (score >= 70) return { rarity: "epic", label: "אפי", color: "הילה סגולה-אדומה" };
  if (score >= 35) return { rarity: "rare", label: "נדיר", color: "ברק כחול-כסוף" };
  return { rarity: "common", label: "רגיל", color: "אווירה אפורה-ערפילית" };
}

function buildPrompt(stats: any) {
  const { streak = 0, level = 1, completedToday = 0, totalToday = 0, displayName = "Warrior" } = stats;
  const rate = totalToday > 0 ? completedToday / totalToday : 0;
  const r = pickRarity(streak, level, rate);

  const archetypes = ["spartan warrior", "samurai", "viking berserker", "roman gladiator", "ronin", "knight templar", "shaolin monk"];
  const archetype = archetypes[(streak + level) % archetypes.length];

  const armor = level < 5 ? "leather armor, simple weapons" :
                level < 15 ? "iron armor, battle scars" :
                level < 30 ? "ornate steel armor, glowing runes" :
                "obsidian and gold legendary armor, ancient sigils";

  const aura = r.color;
  const intensity = streak > 30 ? "intense fierce expression, eyes glowing" :
                    streak > 7 ? "determined steely gaze" :
                    "calm focused look";

  return `Cinematic ultra-detailed portrait of a ${archetype}, ${armor}, ${intensity}, ${aura}, dramatic rim lighting, dark moody background with smoke and embers, hyper-realistic, 8k, photorealistic fantasy art, centered face and shoulders portrait, epic atmosphere, masterpiece quality. NO text, NO letters, NO words in the image.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = auth.user.id;

    const stats = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Already generated today?
    const { data: existing } = await serviceClient
      .from("warrior_portraits")
      .select("*")
      .eq("user_id", userId)
      .eq("portrait_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ portrait: existing, alreadyExists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = buildPrompt(stats);
    const r = pickRarity(stats.streak || 0, stats.level || 1, stats.totalToday ? stats.completedToday / stats.totalToday : 0);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI image gen failed:", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "מגבלת קצב הושגה, נסה שוב בעוד דקה" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "נדרשת הוספת קרדיטים ב-Lovable AI" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Image generation failed");
    }

    const aiData = await aiResp.json();
    const dataUrl = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) throw new Error("No image returned from AI");

    // Decode base64 to bytes
    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const filePath = `${userId}/${today}-${crypto.randomUUID().slice(0, 8)}.png`;
    const { error: uploadErr } = await serviceClient.storage
      .from("warrior-portraits")
      .upload(filePath, bytes, { contentType: "image/png", upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: pub } = serviceClient.storage.from("warrior-portraits").getPublicUrl(filePath);
    const imageUrl = pub.publicUrl;

    const { data: inserted, error: insErr } = await serviceClient
      .from("warrior_portraits")
      .insert({
        user_id: userId,
        portrait_date: today,
        image_url: imageUrl,
        prompt,
        stats,
        level: stats.level || 1,
        streak: stats.streak || 0,
        rarity: r.rarity,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ portrait: inserted, rarity: r }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-warrior-portrait error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
