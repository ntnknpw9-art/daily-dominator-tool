// RevenueCat integration — iOS only. No-op on web/Android.
// Premium is purely optional: nothing in the app changes based on status.

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export const PRODUCT_MONTHLY = 'com.natanknafo.dailydominator';
export const PRODUCT_YEARLY = 'com.natanknafo.dailydominatoro';

// Public SDK key from RevenueCat (Apple). Safe to ship in client.
const REVENUECAT_IOS_API_KEY = (import.meta as any).env?.VITE_REVENUECAT_IOS_API_KEY || '';

let initialized = false;

const isIOS = () =>
  typeof window !== 'undefined' &&
  Capacitor.isNativePlatform() &&
  Capacitor.getPlatform() === 'ios';

async function ensureInit(userId?: string) {
  if (!isIOS()) return null;
  if (!REVENUECAT_IOS_API_KEY) return null;
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  if (!initialized) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY, appUserID: userId });
    initialized = true;
  } else if (userId) {
    try { await Purchases.logIn({ appUserID: userId }); } catch {}
  }
  return Purchases;
}

export async function getOfferings() {
  const Purchases = await ensureInit();
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

async function syncToSupabase(params: {
  isPremium: boolean;
  productId?: string | null;
  expiresAt?: string | null;
  rcUserId?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return;
  await supabase.from('user_subscriptions').upsert({
    user_id: user.id,
    is_premium: params.isPremium,
    product_id: params.productId ?? null,
    expires_at: params.expiresAt ?? null,
    revenuecat_user_id: params.rcUserId ?? null,
  }, { onConflict: 'user_id' });
}

function extractActive(customerInfo: any): { isPremium: boolean; productId: string | null; expiresAt: string | null } {
  const ent = customerInfo?.entitlements?.active || {};
  const keys = Object.keys(ent);
  if (keys.length > 0) {
    const first = ent[keys[0]];
    return {
      isPremium: true,
      productId: first?.productIdentifier ?? null,
      expiresAt: first?.expirationDate ?? null,
    };
  }
  // Fallback: check activeSubscriptions
  const subs: string[] = customerInfo?.activeSubscriptions || [];
  if (subs.length > 0) {
    return { isPremium: true, productId: subs[0], expiresAt: null };
  }
  return { isPremium: false, productId: null, expiresAt: null };
}

export async function purchasePackage(pkg: any) {
  const { data: auth } = await supabase.auth.getUser();
  const Purchases = await ensureInit(auth.user?.id);
  if (!Purchases) throw new Error('רכישות זמינות רק באפליקציית iOS');
  const result: any = await Purchases.purchasePackage({ aPackage: pkg });
  const info = result.customerInfo;
  const active = extractActive(info);
  await syncToSupabase({
    ...active,
    rcUserId: info?.originalAppUserId ?? null,
  });
  return active;
}

export async function restorePurchases() {
  const { data: auth } = await supabase.auth.getUser();
  const Purchases = await ensureInit(auth.user?.id);
  if (!Purchases) throw new Error('שחזור זמין רק באפליקציית iOS');
  const result: any = await Purchases.restorePurchases();
  const info = result.customerInfo;
  const active = extractActive(info);
  await syncToSupabase({
    ...active,
    rcUserId: info?.originalAppUserId ?? null,
  });
  return active;
}

export async function refreshPremiumStatus() {
  const { data: auth } = await supabase.auth.getUser();
  const Purchases = await ensureInit(auth.user?.id);
  if (!Purchases) return null;
  try {
    const result: any = await Purchases.getCustomerInfo();
    const info = result.customerInfo;
    const active = extractActive(info);
    await syncToSupabase({
      ...active,
      rcUserId: info?.originalAppUserId ?? null,
    });
    return active;
  } catch {
    return null;
  }
}

export const isIOSNative = isIOS;
