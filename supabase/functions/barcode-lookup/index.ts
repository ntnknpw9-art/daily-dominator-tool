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

    const { barcode } = await req.json();
    if (!barcode || typeof barcode !== "string" || barcode.length < 4) {
      return new Response(
        JSON.stringify({ error: "ברקוד לא תקין" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query Open Food Facts API (free, no API key needed)
    const code = barcode.replace(/\D/g, "");
    const notFound = () =>
      new Response(
        JSON.stringify({ found: false, error: "המוצר לא נמצא במאגר. נסה להוסיף ידנית." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    let response: Response;
    try {
      response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=product_name,brands,nutriments,serving_size,image_url,quantity`,
        { headers: { "User-Agent": "DailyDominator/1.0 (support@dailydominator.org)" } }
      );
    } catch (fetchErr) {
      console.error("OFF fetch failed:", fetchErr);
      return new Response(
        JSON.stringify({ error: "שגיאה בחיבור למאגר המוצרים. נסה שוב." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OFF returns 404 for unknown barcodes — that's "not found", not a server error
    if (response.status === 404) return notFound();

    if (!response.ok) {
      console.error("OFF error status:", response.status);
      return new Response(
        JSON.stringify({ error: "שגיאה בחיפוש המוצר" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      return notFound();
    }

    if (data.status === 0 || !data.product) return notFound();


    const p = data.product;
    const n = p.nutriments || {};

    // Calculate per serving if available, otherwise per 100g
    const servingSize = p.serving_size || "100g";
    const hasServing = !!n["energy-kcal_serving"];

    const result = {
      found: true,
      barcode,
      name: p.product_name || "מוצר לא ידוע",
      brand: p.brands || "",
      image_url: p.image_url || null,
      quantity: p.quantity || "",
      serving_size: servingSize,
      per_serving: {
        calories: Math.round(hasServing ? (n["energy-kcal_serving"] || 0) : (n["energy-kcal_100g"] || 0)),
        protein: Math.round(hasServing ? (n["proteins_serving"] || 0) : (n["proteins_100g"] || 0)),
        fat: Math.round(hasServing ? (n["fat_serving"] || 0) : (n["fat_100g"] || 0)),
        carbs: Math.round(hasServing ? (n["carbohydrates_serving"] || 0) : (n["carbohydrates_100g"] || 0)),
      },
      per_100g: {
        calories: Math.round(n["energy-kcal_100g"] || 0),
        protein: Math.round(n["proteins_100g"] || 0),
        fat: Math.round(n["fat_100g"] || 0),
        carbs: Math.round(n["carbohydrates_100g"] || 0),
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("barcode-lookup error:", e);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
