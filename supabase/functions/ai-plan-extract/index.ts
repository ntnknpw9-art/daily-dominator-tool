import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { analysisText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `אתה ממיר טקסט תוכנית כושר ותזונה בעברית למבנה JSON.
החזר אך ורק JSON תקין לפי הסכמה (ללא טקסט נוסף, ללא markdown).

סכמה:
{
  "water_liters": number (כמה ליטר מים ביום, ברירת מחדל 2.5),
  "sleep_hours": number (שעות שינה, ברירת מחדל 7),
  "nutrition": {
    "calories": number,
    "protein": number (גרם),
    "carbs": number (גרם),
    "fat": number (גרם)
  },
  "training": {
    "days_per_week": number,
    "split_type": string (לדוגמה "PPL", "Upper/Lower"),
    "schedule": [
      { "day": "ראשון" | "שני" | "שלישי" | "רביעי" | "חמישי" | "שישי" | "שבת", "focus": string (כגון "חזה+כתף+טריצפס"), "description": string (התרגילים המלאים: שם תרגיל, סטים×חזרות, מופרדים בפסיק) }
    ]
  }
}

חוקים:
- חלק את כל ימי האימון לימי השבוע בעברית.
- description חייב להכיל את התרגילים המדויקים מהתוכנית.
- אם משהו חסר בטקסט — נחש לפי המקובל.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `הטקסט להמרה:\n\n${analysisText}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאת AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let plan;
    try { plan = JSON.parse(content); } catch { plan = {}; }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
