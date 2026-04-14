import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "calculate_needs") {
      const { age, gender, height, weight, activityLevel, goal } = data;
      systemPrompt = `אתה דיאטן מומחה. חשב צריכת קלוריות יומית מומלצת ומאקרו (חלבונים, שומנים, פחמימות) לפי הנתונים.
השתמש בנוסחת Mifflin-St Jeor לחישוב BMR ואז התאם לפי רמת פעילות ומטרה.
החזר JSON בלבד בפורמט הבא (בלי markdown, בלי backticks):
{"calories": number, "protein": number, "fat": number, "carbs": number, "bmr": number, "explanation": "string in Hebrew"}`;
      userPrompt = `גיל: ${age}, מין: ${gender}, גובה: ${height} ס"מ, משקל: ${weight} ק"ג, רמת פעילות: ${activityLevel}, מטרה: ${goal}`;
    } else if (type === "analyze_food") {
      const { foodDescription } = data;
      systemPrompt = `אתה דיאטן מומחה. נתח את המאכל שהמשתמש מתאר והחזר את הערכים התזונתיים המשוערים.
החזר JSON בלבד בפורמט הבא (בלי markdown, בלי backticks):
{"name": "string in Hebrew", "calories": number, "protein": number, "fat": number, "carbs": number, "portion": "string in Hebrew"}`;
      userPrompt = `נתח את המאכל הבא: ${foodDescription}`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
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

    // Try to parse JSON from the response
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
