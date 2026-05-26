// RevenueCat integration — iOS only. No-op on web/Android.
// Premium is purely optional: nothing in the app changes based on status.

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * Central mapping for all in-app purchase products.
 * Single source of truth — do NOT hardcode product IDs elsewhere.
 * Keys must match the App Store Connect Product IDs exactly.
 */
export const PRODUCTS = {
  monthly: {
    id: 'com.natanknafo.dailydominator',
    label: 'תמיכה חודשית',
    period: 'month' as const,
  },
  yearly: {
    id: 'com.natanknafo.dailydominatork',
    label: 'תמיכה שנתית',
    period: 'year' as const,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;

export const ALL_PRODUCT_IDS = Object.values(PRODUCTS).map((p) => p.id);

export const getProductById = (id: string | null | undefined) =>
  Object.values(PRODUCTS).find((p) => p.id === id) ?? null;

// Backward-compatible exports — derived from the central map.
export const PRODUCT_MONTHLY = PRODUCTS.monthly.id;
export const PRODUCT_YEARLY = PRODUCTS.yearly.id;

// Public SDK key from RevenueCat (Apple). Safe to ship in client.
const REVENUECAT_IOS_API_KEY =
  (import.meta as any).env?.VITE_REVENUECAT_IOS_API_KEY ||
  'appl_OsIuxnzzmIfeIVgsxDoYxxuxgDF';

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

async function syncToSupabase() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return;
  // Subscriptions are written server-side after verifying with RevenueCat.
  // Clients cannot insert/update user_subscriptions directly.
  try {
    await supabase.functions.invoke('sync-subscription');
  } catch (e) {
    console.warn('sync-subscription failed', e);
  }
}

export const PREMIUM_ENTITLEMENT = 'premium';

function extractActive(customerInfo: any): { isPremium: boolean; productId: string | null; expiresAt: string | null } {
  const active = customerInfo?.entitlements?.active || {};
  // Prefer the explicit "premium" entitlement configured in RevenueCat
  const premium = active[PREMIUM_ENTITLEMENT];
  if (premium) {
    return {
      isPremium: true,
      productId: premium?.productIdentifier ?? null,
      expiresAt: premium?.expirationDate ?? null,
    };
  }
  // Fallback: any active entitlement also counts
  const keys = Object.keys(active);
  if (keys.length > 0) {
    const first = active[keys[0]];
    return {
      isPremium: true,
      productId: first?.productIdentifier ?? null,
      expiresAt: first?.expirationDate ?? null,
    };
  }
  // Final fallback: activeSubscriptions list
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
  await syncToSupabase();
  return active;
}

export async function restorePurchases() {
  const { data: auth } = await supabase.auth.getUser();
  const Purchases = await ensureInit(auth.user?.id);
  if (!Purchases) throw new Error('שחזור זמין רק באפליקציית iOS');
  const result: any = await Purchases.restorePurchases();
  const info = result.customerInfo;
  const active = extractActive(info);
  await syncToSupabase();
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
    await syncToSupabase();
    return active;
  } catch {
    return null;
  }
}

export const isIOSNative = isIOS;
