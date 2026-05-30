// Server-side subscription sync. Verifies entitlement with RevenueCat REST API
// using a server-only secret, then writes via service_role. Clients are not
// allowed to write to user_subscriptions directly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getTime = (dateValue?: string | null) => {
  if (!dateValue) return null;
  const time = new Date(dateValue).getTime();
  return Number.isFinite(time) ? time : null;
};

const extractPremium = (subscriber: Record<string, any>) => {
  const entitlements = subscriber?.entitlements ?? {};
  const activeEntitlement = Object.values(entitlements).find((ent: any) => {
    const expires = getTime(ent?.expires_date);
    return ent && (!expires || expires > Date.now());
  }) as any | undefined;

  if (activeEntitlement) {
    return {
      isPremium: true,
      productId: activeEntitlement.product_identifier ?? null,
      expiresAt: activeEntitlement.expires_date ?? null,
    };
  }

  const subscriptions = subscriber?.subscriptions ?? {};
  const activeSubscription = Object.entries(subscriptions).find(([, sub]: [string, any]) => {
    const expires = getTime(sub?.expires_date);
    return sub && (!expires || expires > Date.now());
  }) as [string, any] | undefined;

  if (activeSubscription) {
    const [fallbackProductId, subscription] = activeSubscription;
    return {
      isPremium: true,
      productId: subscription.product_identifier ?? fallbackProductId,
      expiresAt: subscription.expires_date ?? null,
    };
  }

  return { isPremium: false, productId: null, expiresAt: null };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rcSecret = Deno.env.get("REVENUECAT_SECRET_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Never trust a caller-provided RevenueCat user id. The subscriber id is
    // derived from the authenticated app user so one user cannot claim another
    // user's paid entitlement.
    const subscriberId = user.id;

    let isPremium = false;
    let productId: string | null = null;
    let expiresAt: string | null = null;

    if (rcSecret) {
      const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(subscriberId)}`, {
        headers: { Authorization: `Bearer ${rcSecret}` },
      });
      if (!rcRes.ok) {
        return new Response(JSON.stringify({ error: "RevenueCat verification failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const body = await rcRes.json();
      const premium = extractPremium(body?.subscriber ?? {});
      isPremium = premium.isPremium;
      productId = premium.productId;
      expiresAt = premium.expiresAt;
    } else {
      return new Response(JSON.stringify({ error: "Server missing REVENUECAT_SECRET_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: upsertError } = await admin.from("user_subscriptions").upsert({
      user_id: user.id,
      is_premium: isPremium,
      product_id: productId,
      expires_at: expiresAt,
      revenuecat_user_id: subscriberId,
    }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("subscription upsert failed", upsertError);
      return new Response(JSON.stringify({ error: "Subscription sync failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ isPremium, productId, expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
