import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { analysisText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `אתה מאמן כושר מקצועי ברמה עולמית + תזונאי ספורט מוסמך, עם ניסיון של 20+ שנה בבניית תוכניות אימון אישיות. אתה מתמחה בהיפרטרופיה, חיטוב, רקומפ, וקליסטניקס.

המשימה: על סמך פרופיל המשתמש שיגיע בהודעה הבאה, בנה את **תוכנית האימון והתזונה הטובה ביותר האפשרית** עבורו - מותאמת בדיוק למטרה, לניסיון, לימי האימון, למקום, ולשרירים שביקש להתמקד בהם. אל תיתן תוכנית גנרית - כל בחירת תרגיל חייבת להיות מנומקת ע"י עקרונות מדעיים (Mechanical tension, RIR, progressive overload, recovery, frequency 2x/week per muscle group כשניתן).

כללי בניית התוכנית:
1. **פיצול חכם**: 2-3 ימים=Full Body, 4 ימים=Upper/Lower, 5 ימים=PPL+UL, 6 ימים=PPL כפול. אם המשתמש ביקש שרירים ספציפיים — תן להם תדירות גבוהה (2x בשבוע) ונפח מוגבר, בלי להזניח את שאר הגוף.
2. **תרגילים**: התחל מתרגיל מורכב כבד (compound), המשך לתרגילי בידוד. 4-6 תרגילים ליום. עבור מתחילים — 3 סטים, בינוני/מתקדם — 3-4 סטים. חזרות: כוח 5-8, היפרטרופיה 8-12, סבולת/חיטוב 12-15. הוסף RIR (Reps in Reserve 1-3).
3. **לפי מקום אימון**:
   - חדר כושר: ברבל, דמבלים, מכונות.
   - בית עם משקולות: דמבלים, גומיות, משקל גוף.
   - בית בלי ציוד: רק משקל גוף עם פרוגרסיות.
   - קליסטניקס: מתח, מקבילים, פלאנש, פרונט ליבר, מאסל אפ, פיסטול סקוואט — עם פרוגרסיות מותאמות לרמה.
4. **תזונה מדעית**:
   - BMR = Mifflin-St Jeor. TDEE = BMR × activity factor (1.2 יושבני, 1.55 בינוני, 1.725 פעיל).
   - חיטוב: TDEE - 400. מסה: TDEE + 300. רקומפ/כללי: TDEE.
   - חלבון: 2.0-2.2 גר'/ק"ג (חיטוב גבוה יותר). שומן: 0.8-1.0 גר'/ק"ג. פחמימות: השאר.
   - מים: 35 מ"ל × משקל. שינה: 7-9 שעות.
5. **description לכל יום**: רשימת תרגילים מלאה ומדויקת בפורמט "שם תרגיל סטים×חזרות @RIR, ..." (למשל "ספסל שטוח ברבל 4×6-8 @RIR2, לחיצת כתפיים דמבל 3×8-10 @RIR2, ..."). 4-6 תרגילים. ללא בלאבלה.
6. **focus**: שמות שרירים מדויקים בעברית (למשל "חזה + כתף קדמית + טריצפס").

החזר JSON תקין בלבד (ללא markdown, ללא הסברים) לפי הסכמה:

{
  "water_liters": number,
  "sleep_hours": number,
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "training": {
    "days_per_week": number,
    "split_type": string,
    "schedule": [
      { "day": "ראשון"|"שני"|"שלישי"|"רביעי"|"חמישי"|"שישי"|"שבת", "focus": string, "description": string }
    ]
  }
}

חוקים קשיחים:
- חלק בדיוק את מספר ימי האימון לימי השבוע (התחל מראשון, השאר ימי מנוחה).
- description חייב להכיל תרגילים אמיתיים עם סטים×חזרות.
- אם המשתמש בחר שרירים ספציפיים — וודא שכל אחד מהם מקבל לפחות 2 תרגילים בשבוע.
- אם בחר "כל הגוף" — תוכנית מאוזנת לכל קבוצות השרירים.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `פרופיל המשתמש:\n\n${analysisText}\n\nבנה את התוכנית הכי טובה האפשרית עבורו. החזר JSON בלבד.` },
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
