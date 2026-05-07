import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userContent: any = "";

    if (type === "calculate_needs") {
      const { age, gender, height, weight, activityLevel, goal } = data;
      systemPrompt = `אתה דיאטן מומחה. חשב צריכת קלוריות יומית מומלצת ומאקרו (חלבונים, שומנים, פחמימות) לפי הנתונים.
השתמש בנוסחת Mifflin-St Jeor לחישוב BMR ואז התאם לפי רמת פעילות ומטרה.
החזר JSON בלבד בפורמט הבא (בלי markdown, בלי backticks):
{"calories": number, "protein": number, "fat": number, "carbs": number, "bmr": number, "explanation": "string in Hebrew"}`;
      userContent = `גיל: ${age}, מין: ${gender}, גובה: ${height} ס"מ, משקל: ${weight} ק"ג, רמת פעילות: ${activityLevel}, מטרה: ${goal}`;
    } else if (type === "analyze_food") {
      const { foodDescription } = data;
      systemPrompt = `אתה דיאטן מומחה. נתח את המאכל שהמשתמש מתאר והחזר את הערכים התזונתיים המשוערים.
החזר JSON בלבד בפורמט הבא (בלי markdown, בלי backticks):
{"name": "string in Hebrew", "calories": number, "protein": number, "fat": number, "carbs": number, "portion": "string in Hebrew"}`;
      userContent = `נתח את המאכל הבא: ${foodDescription}`;
    } else if (type === "scan_food") {
      const { imageBase64, mimeType } = data;
      if (!imageBase64) throw new Error("Missing image data");

      systemPrompt = `אתה דיאטן מומחה מהשורה הראשונה עם ניסיון של 20 שנה. נתח את התמונה של האוכל בדיוק מרבי.

עליך לזהות:
1. סוג המאכל/ים בתמונה - זהה כל פריט בנפרד
2. שיטת הבישול (מטוגן, אפוי, מבושל, גרילד, נא, על האש, מאודה וכו')
3. הערך את גודל המנה והמשקל המשוער בגרמים בהתבסס על הפרופורציות בתמונה
4. חשב קלוריות בדיוק תוך התחשבות בשיטת הבישול (מטוגן = יותר שומן וקלוריות, אפוי = פחות)
5. חשב מאקרו: חלבון, שומן, פחמימות

אם יש מספר מאכלים בתמונה, סכם את הכל ביחד.
התייחס לרטבים, שמנים, תוספות, לחם, ושאר מרכיבים שנראים בתמונה.

החזר JSON בלבד בפורמט הבא (בלי markdown, בלי backticks):
{"name": "שם המנה בעברית", "calories": number, "protein": number, "fat": number, "carbs": number, "portion": "תיאור מפורט של המנה כולל משקל משוער בגרמים ושיטת בישול", "items": [{"name": "שם פריט", "calories": number, "weight_grams": number}], "cooking_method": "שיטת בישול", "estimated_weight_grams": number, "confidence": "high/medium/low"}`;

      userContent = [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
          },
        },
        {
          type: "text",
          text: "נתח את האוכל בתמונה. זהה כל פריט, שיטת בישול, משקל משוער, וחשב ערכים תזונתיים מדויקים.",
        },
      ];
    } else {
      return new Response(JSON.stringify({ error: "Unknown type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(userContent)) {
      messages.push({ role: "user", content: userContent });
    } else {
      messages.push({ role: "user", content: userContent });
    }

    // Use vision-capable model for image analysis
    const model = type === "scan_food" 
      ? "google/gemini-2.5-flash" 
      : "google/gemini-3-flash-preview";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "יותר מדי בקשות, נסה שוב בעוד דקה" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "נגמרו הקרדיטים" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "שגיאה בשירות ה-AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calorie-tracker error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
