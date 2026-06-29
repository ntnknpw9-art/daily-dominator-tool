import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTION_PROTOCOL = `
=== פרוטוקול פעולות (חשוב!) ===
אתה יכול לבצע שינויים אמיתיים במשימות ובתוכנית האימונים של המשתמש.
כשהמשתמש מבקש להוסיף, לערוך, למחוק משימה, או לעדכן תוכנית אימון — סיים את התשובה שלך בבלוק JSON בפורמט הבא:

[ACTIONS]
[
  {
    "type": "create_task",
    "name": "ריצת בוקר",
    "category": "כושר",
    "startTime": "06:30",
    "endTime": "07:15",
    "days": ["ראשון","שלישי","חמישי"],
    "startDate": "2025-01-01",
    "endDate": "2026-12-31",
    "meaning": "בריאות וחוסן",
    "workoutDetails": [
      {"day":"ראשון","description":"Push (חזה, כתפיים, טריצפס) 1. לחיצת חזה ברבל – 4x8-10 @RIR2, 2. לחיצת כתפיים – 4x8 @RIR2"}
    ]
  },
  {"type": "update_task", "id": "<task-id>", "changes": {"name":"...", "startTime":"...", "days":["..."], "workoutDetails":[...]}},
  {"type": "delete_task", "id": "<task-id>"}
]
[/ACTIONS]

חוקי זהב:
- categories מותרות בלבד: "כושר","לימודים","כסף","משמעת","אישי"
- days מותרים: "ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"
- startTime/endTime בפורמט "HH:MM"
- workoutDetails: רשימה לפי יום. ב-description פרט תרגילים בפורמט "1. שם תרגיל – NxR-R, 2. ..."

🚨 חובה מוחלטת — תוכנית אימונים:
אם המשתמש מדביק/כותב/שולח תוכנית אימונים כלשהי (אפילו בלי לבקש במפורש "תוסיף") — אתה **חייב** לסיים את התשובה בבלוק [ACTIONS]. בלי בלוק = כישלון.
- אם יש כבר משימת "כושר" ברשימת המשימות בקונטקסט → השתמש ב-update_task עם ה-id שלה ועדכן workoutDetails לכל הימים בתוכנית החדשה.
- אם אין משימת "כושר" קיימת → צור משימת כושר חדשה עם create_task, days = כל הימים בתוכנית, ו-workoutDetails לכל יום בנפרד.
- כל יום בתוכנית = אובייקט נפרד ב-workoutDetails. אל תאחד ימים.
- אל תכניס תרגילים ל-meaning/name — רק ב-workoutDetails. אחרת מסך האימונים לא יתעדכן.

חוקים כלליים:
- השתמש ב-id מהרשימה שמופיעה בקונטקסט בלבד (לא להמציא ID).
- אם המשתמש שאל שאלה כללית בלי נתונים לשנות — אל תכלול [ACTIONS].
- לפני הבלוק, הסבר בקצרה (1-2 משפטים) מה אתה עומד לשנות. המשתמש יאשר ידנית בכפתור.
- בקש מהמשתמש לצרף תמונה (📎) אם תמונה תעזור לך לתת תשובה מדויקת יותר.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;

    if (mode === "analyze") {
      systemPrompt = `אתה מנתח ביצועים ומאמן משמעת מומחה. אתה מדבר בעברית.

הנה הנתונים:
${context || 'אין נתונים'}

נתח דפוסים, תן פידבק כנה, הצע 2-3 שינויים קונקרטיים, וסיים בציון משמעת ומשפט מוטיבציוני.`;

    } else if (mode === "failure_analysis") {
      systemPrompt = `אתה מנתח כישלונות מומחה, חד וישיר. עברית.

הנה הנתונים:
${context || 'אין נתונים'}

זהה סיבות אמיתיות לפספוסים, דפוסי כישלון חוזרים, והצע פתרונות קונקרטיים. אל תתחנף.`;

    } else if (mode === "behavior_engine") {
      systemPrompt = `אתה מנוע התנהגות AI. עברית.

הנה הנתונים:
${context || 'אין נתונים'}

זהה דפוסים, הצע שינויי לו"ז, וזהה נפילות. אם יש שינוי — השתמש בפרוטוקול הפעולות.`;

    } else if (mode === "no_mercy") {
      systemPrompt = `אתה מאמן אכזרי. אפס רחמים. אפס תירוצים. עברית בלבד.

הנה הנתונים:
${context || 'אין נתונים'}

תהיה קשוח, ישיר, בלי פילטרים. תסיים עם אתגר.`;

    } else if (mode === "nutrition_link") {
      systemPrompt = `אתה מנתח תזונה ואימונים מומחה. עברית.

הנה הנתונים:
${context || 'אין נתונים'}

נתח את הקשר בין תזונה לביצועים, זהה חוסרים, הצע שיפורים תזונתיים.`;

    } else {
      systemPrompt = `אתה מאמן משמעת עצמית ופיתוח אישי. אתה מדבר בעברית.
אתה חד, ישיר, מוטיבציוני ולפעמים קשוח.
אם המשתמש שולח תמונה — תנתח אותה (תפריט, ארוחה, מכשיר כושר, מסך, וכו') ותקשר לתשובה שלך.

הנה המידע על המשתמש:
${context || 'אין מידע זמין כרגע'}

תן טיפים פרקטיים, נתח דפוסים, והשתמש בפרוטוקול הפעולות כשנדרש שינוי.`;
    }

    systemPrompt += "\n" + ACTION_PROTOCOL;

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
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
