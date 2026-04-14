import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;

    if (mode === "analyze") {
      systemPrompt = `אתה מנתח ביצועים ומאמן משמעת מומחה. אתה מדבר בעברית.
אתה מקבל נתוני ביצועים מפורטים של המשתמש ומנתח אותם לעומק.

הנה הנתונים:
${context || 'אין נתונים'}

המשימה שלך:
1. **ניתוח דפוסים** - זהה מתי המשתמש חזק ומתי חלש (לפי שעות, ימים, קטגוריות)
2. **פידבק כנה** - תן פידבק ישיר, חד ותכליתי. לא להתחנף.
3. **המלצות מעשיות** - הצע שינויים קונקרטיים בלוח הזמנים. למשל: "אתה חלש בערב. תעביר את האימון לצהריים."
4. **נקודות חוזק** - ציין מה עובד טוב כדי לא לשנות את זה.

פורמט:
- השתמש באימוג'ים
- תן כותרות ברורות
- הצע 2-3 שינויים קונקרטיים עם הסבר למה
- תסיים עם ציון משמעת (1-100) ומשפט מוטיבציוני`;
    } else {
      systemPrompt = `אתה מאמן משמעת עצמית ופיתוח אישי. אתה מדבר בעברית.
אתה חד, ישיר, מוטיבציוני ולפעמים קשוח - כמו מאמן אמיתי.
תענה בקצרה ותכליתית. השתמש באימוג'ים.

הנה המידע על המשתמש:
${context || 'אין מידע זמין כרגע'}

כללים:
- תן טיפים פרקטיים ופשוטים
- אם המשתמש מתעצל, תהיה קשוח אבל מעודד
- אם יש לו רצף (streak) טוב, תחגוג איתו
- אם יש לך נתוני ביצועים, נתח דפוסים והצע שינויים קונקרטיים
- תמיד תסיים עם משפט מוטיבציוני או שאלה`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות. נסה שוב בעוד דקה." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש תשלום." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאת AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
