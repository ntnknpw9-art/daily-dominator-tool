import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { beforeUrl, afterUrl, beforeDate, afterDate, goal } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const goalText = goal === 'cut'
      ? 'חיטוב — ירידה באחוזי שומן תוך שמירה על מסת שריר'
      : goal === 'recomp'
        ? 'ריקומפוזיציה — שמירה והעלאת שריר במקביל לירידה באחוז שומן'
        : 'מראה אסתטי כללי';

    const systemPrompt = `אתה מאמן כושר ותזונה מקצועי ברמה עולמית. עברית בלבד. ישיר, כנה, ומדויק.
המטרה של המתאמן: ${goalText}.
קיבלת שתי תמונות: "לפני" (${beforeDate || 'לא ידוע'}) ו-"אחרי" (${afterDate || 'לא ידוע'}).
נתח לעומק את ההבדלים הוויזואליים — שריר, אחוז שומן, יציבה, סימטריה, ווסקולריות, חיטוב.
תן ציון התקדמות לקראת מראה של 100% (אסתטי, מחוטב, מסת שריר טובה).

פורמט תשובה (Markdown מלא):

### 📊 ניתוח השוואה
**לפני:** ${beforeDate || 'לא ידוע'} → **אחרי:** ${afterDate || 'לא ידוע'}

### 💪 שינויים שזיהיתי
- [שינוי קונקרטי 1]
- [שינוי קונקרטי 2]
- [שינוי קונקרטי 3]
- [שינוי קונקרטי 4]

### 📈 ציון נוכחי לקראת 100%
**[X]/100**
[הסבר קצר למה הציון הזה]

### ⚠️ נקודות חולשה עיקריות
1. [נקודה 1 — איזה אזור בגוף]
2. [נקודה 2]
3. [נקודה 3]

### 🍽️ תפריט מומלץ ל${goalText}
**קלוריות יומיות מומלצות:** [טווח]
**חלוקת מאקרו:** חלבון [Xg], פחמימות [Xg], שומן [Xg]

**ארוחת בוקר:** [דוגמה ספציפית]
**ארוחת ביניים:** [דוגמה]
**צהריים:** [דוגמה]
**לפני אימון:** [דוגמה]
**אחרי אימון:** [דוגמה]
**ערב:** [דוגמה]

**טיפים תזונתיים:**
- [טיפ 1]
- [טיפ 2]
- [טיפ 3]

### 🏋️ תוכנית אימונים מומלצת
**תדירות:** [X ימים בשבוע]
**חלוקה (split):** [Push/Pull/Legs / Upper/Lower / וכו']

**יום 1 — [שם]:**
- [תרגיל] — [סטים]x[חזרות]
- [תרגיל] — [סטים]x[חזרות]
- [תרגיל] — [סטים]x[חזרות]

**יום 2 — [שם]:**
- [תרגיל] — [סטים]x[חזרות]
- [תרגיל] — [סטים]x[חזרות]
- [תרגיל] — [סטים]x[חזרות]

**יום 3 — [שם]:**
- [תרגיל] — [סטים]x[חזרות]
- [תרגיל] — [סטים]x[חזרות]
- [תרגיל] — [סטים]x[חזרות]

**קרדיו:** [המלצה ספציפית — HIIT / LISS / כמה דקות]

### 🎯 פוקוס לאזורי החולשה
- [תרגיל ספציפי לחולשה 1]
- [תרגיל ספציפי לחולשה 2]
- [תרגיל ספציפי לחולשה 3]

### ⏱️ זמן משוער ל-100%
[X שבועות/חודשים] אם תעקוב אחרי התוכנית במלואה.

### 🔥 משפט סיום
[משפט קצר, חד, מוטיבציוני]`;

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
          {
            role: "user",
            content: [
              { type: "text", text: `תמונה 1 — לפני (${beforeDate || ''}):` },
              { type: "image_url", image_url: { url: beforeUrl } },
              { type: "text", text: `תמונה 2 — אחרי (${afterDate || ''}):` },
              { type: "image_url", image_url: { url: afterUrl } },
              { type: "text", text: `נתח את ההתקדמות. מטרה: ${goalText}. תן ניתוח מלא לפי הפורמט.` },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות. נסה שוב בעוד דקה." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש תשלום ב-Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "שגיאת AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "לא התקבל ניתוח";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
