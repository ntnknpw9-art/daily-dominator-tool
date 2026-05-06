import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { beforeUrl, afterUrl, beforeDate, afterDate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `אתה מאמן כושר ומנתח תמונות התקדמות. עברית בלבד. ישיר וכנה.
קיבלת שתי תמונות: "לפני" ו-"אחרי". נתח את ההבדלים הוויזואליים ותן הערכה.

פורמט תשובה:
### 📊 ניתוח השוואה
**תאריך לפני:** ${beforeDate || 'לא ידוע'}
**תאריך אחרי:** ${afterDate || 'לא ידוע'}

### 💪 התקדמות שזיהיתי
- [שינוי 1]
- [שינוי 2]
- [שינוי 3]

### 📈 ציון התקדמות
[ציון 1-100] / 100
[משפט הסבר קצר]

### ⚠️ מה צריך לשפר
1. [נקודה לשיפור]
2. [נקודה לשיפור]

### 🎯 המלצות לשלב הבא
- [המלצה קונקרטית 1]
- [המלצה קונקרטית 2]
- [המלצה קונקרטית 3]

### 🔥 משפט סיום מוטיבציוני
[משפט קצר וחד]`;

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
          {
            role: "user",
            content: [
              { type: "text", text: "תמונה 1 — לפני:" },
              { type: "image_url", image_url: { url: beforeUrl } },
              { type: "text", text: "תמונה 2 — אחרי:" },
              { type: "image_url", image_url: { url: afterUrl } },
              { type: "text", text: "נתח את ההתקדמות בין השתיים." },
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
