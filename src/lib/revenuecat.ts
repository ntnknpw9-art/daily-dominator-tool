// RevenueCat integration — iOS only. No-op on web/Android.
// Premium is purely optional: nothing in the app changes based on status.

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export type RevenueCatProduct = {
  identifier?: string;
  title?: string;
  description?: string;
  price?: number;
  priceString?: string;
  currencyCode?: string;
  productType?: string;
  subscriptionPeriod?: string | { unit?: string };
};

export type RevenueCatStoreProduct = RevenueCatProduct & {
  identifier: string;
};

export type RevenueCatPackage = {
  identifier?: string;
  packageType?: string;
  offeringIdentifier?: string;
  presentedOfferingContext?: unknown;
  product?: RevenueCatProduct;
};

export type RevenueCatOffering = {
  identifier?: string;
  serverDescription?: string;
  availablePackages?: RevenueCatPackage[];
  monthly?: RevenueCatPackage;
  annual?: RevenueCatPackage;
  lifetime?: RevenueCatPackage;
};

type RevenueCatOfferings = {
  current?: RevenueCatOffering | null;
  all?: Record<string, RevenueCatOffering>;
};

type RevenueCatEntitlement = {
  productIdentifier?: string;
  expirationDate?: string | null;
};

type RevenueCatCustomerInfo = {
  entitlements?: { active?: Record<string, RevenueCatEntitlement> };
  activeSubscriptions?: string[];
};

type RevenueCatPurchaseResult = {
  transaction?: { transactionIdentifier?: string };
  productIdentifier?: string;
  customerInfo?: RevenueCatCustomerInfo;
};

type RevenueCatProductsResult = {
  products?: RevenueCatStoreProduct[];
};

type RevenueCatError = Error & {
  code?: string | number;
  underlyingErrorMessage?: string;
  userCancelled?: boolean;
  readableErrorCode?: string;
  readable_error_code?: string;
  domain?: string;
};

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
  import.meta.env?.VITE_REVENUECAT_IOS_API_KEY ||
  'appl_OsIuxnzzmIfeIVgsxDoYxxuxgDF';

let initialized = false;

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const rcLog = (scope: string, label: string, data?: unknown) => {
  try {
    console.log(`[RC ${scope}] ${label}`, data !== undefined ? safeJson(data) : '');
  } catch {
    console.log(`[RC ${scope}] ${label}`, data);
  }
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const PURCHASE_TIMEOUT_MS = 60000;
const INIT_TIMEOUT_MS = 10000;

const summarizePackage = (pkg?: RevenueCatPackage | null) => ({
  identifier: pkg?.identifier,
  packageType: pkg?.packageType,
  offeringIdentifier: pkg?.offeringIdentifier,
  hasPresentedOfferingContext: Boolean(pkg?.presentedOfferingContext),
  product: {
    identifier: pkg?.product?.identifier,
    title: pkg?.product?.title,
    description: pkg?.product?.description,
    price: pkg?.product?.price,
    priceString: pkg?.product?.priceString,
    currencyCode: pkg?.product?.currencyCode,
    productType: pkg?.product?.productType,
    subscriptionPeriod: pkg?.product?.subscriptionPeriod,
  },
});

const summarizeProduct = (product?: RevenueCatProduct | null) => ({
  identifier: product?.identifier,
  title: product?.title,
  description: product?.description,
  price: product?.price,
  priceString: product?.priceString,
  currencyCode: product?.currencyCode,
  productType: product?.productType,
  subscriptionPeriod: product?.subscriptionPeriod,
});

const summarizeOffering = (offering?: RevenueCatOffering | null) => offering ? ({
  identifier: offering?.identifier,
  serverDescription: offering?.serverDescription,
  availablePackagesCount: offering?.availablePackages?.length ?? 0,
  availablePackages: offering?.availablePackages?.map(summarizePackage) ?? [],
  monthly: summarizePackage(offering?.monthly),
  annual: summarizePackage(offering?.annual),
  lifetime: summarizePackage(offering?.lifetime),
}) : null;

const isIOS = () =>
  typeof window !== 'undefined' &&
  Capacitor.isNativePlatform() &&
  Capacitor.getPlatform() === 'ios';

async function ensureInit(userId?: string) {
  if (!isIOS()) return null;
  if (!REVENUECAT_IOS_API_KEY) {
    rcLog('init', 'NO API KEY configured');
    return null;
  }
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  if (!initialized) {
    const keyPrefix = REVENUECAT_IOS_API_KEY.slice(0, 6);
    const keyLooksValid = REVENUECAT_IOS_API_KEY.startsWith('appl_');
    rcLog('init', 'configuring RevenueCat', {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      apiKeyPrefix: keyPrefix,
      apiKeyLength: REVENUECAT_IOS_API_KEY.length,
      apiKeyLooksLikeIOS: keyLooksValid,
      appUserID: userId ?? '(anonymous)',
      expectedProductIds: ALL_PRODUCT_IDS,
    });
    if (!keyLooksValid) {
      rcLog('init', 'WARNING: API key does NOT start with "appl_" — this may be an Android (goog_) or Web (rcb_) key!');
    }
    await Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE });
    await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY, appUserID: userId });
    initialized = true;
    rcLog('init', 'configured OK');
  } else if (userId) {
    try { await Purchases.logIn({ appUserID: userId }); } catch (e) { rcLog('init', 'logIn failed', e); }
  }
  return Purchases;
}


export async function getOfferings() {
  let Purchases = null;
  try {
    Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, 'RevenueCat initialize');
  } catch (e) {
    const error = e as RevenueCatError;
    rcLog('offerings', 'INIT ERROR', {
      message: error?.message,
      code: error?.code,
      underlyingErrorMessage: error?.underlyingErrorMessage,
      readableErrorCode: error?.readableErrorCode,
      readable_error_code: error?.readable_error_code,
      domain: error?.domain,
      name: error?.name,
      raw: typeof error === 'object' ? safeJson(error) : String(error),
    });
    return null;
  }
  if (!Purchases) {
    rcLog('offerings', 'not initialized', {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      hasApiKey: Boolean(REVENUECAT_IOS_API_KEY),
    });
    return null;
  }
  try {
    const offerings = await withTimeout(Purchases.getOfferings(), 12000, 'RevenueCat getOfferings') as unknown as RevenueCatOfferings;
    const allOfferings = offerings?.all ?? {};
    const defaultOffering = allOfferings.default ?? null;
    const current = defaultOffering ?? offerings?.current ?? null;
    const selectedSource = defaultOffering
      ? 'all.default'
      : offerings?.current
        ? 'current fallback'
        : 'none';
    const pkgCount = current?.availablePackages?.length ?? 0;
    rcLog('offerings', 'loaded', {
      currentIdentifier: current?.identifier ?? null,
      selectedSource,
      currentPackagesCount: pkgCount,
      current: summarizeOffering(current),
      allKeys: Object.keys(allOfferings),
      all: Object.fromEntries(
        Object.entries(allOfferings).map(([key, offering]) => [key, summarizeOffering(offering)])
      ),
      expectedProductIds: ALL_PRODUCT_IDS,
    });
    rcLog('offerings', 'packages count', pkgCount);
    if (!defaultOffering && current) {
      rcLog('offerings', 'No offerings.all.default returned; using offerings.current fallback', {
        selectedSource,
        identifier: current?.identifier,
      });
    }
    if (!current) {
      rcLog('offerings', 'WARNING: No default/current offering returned from RevenueCat. Make sure the default offering exists and has packages attached.');
    } else if (pkgCount === 0) {
      rcLog('offerings', 'WARNING: Current offering has 0 packages. StoreKit did not return the products. Check: (1) Paid Apps Agreement Active, (2) Products attached to the offering in RevenueCat, (3) Bundle ID matches, (4) Sandbox tester signed in on device.');
    }
    return current;
  } catch (e) {
    const error = e as RevenueCatError;
    rcLog('offerings', 'ERROR', {
      message: error?.message,
      code: error?.code,
      underlyingErrorMessage: error?.underlyingErrorMessage,
      readableErrorCode: error?.readableErrorCode,
      readable_error_code: error?.readable_error_code,
      domain: error?.domain,
      name: error?.name,
      raw: typeof error === 'object' ? safeJson(error) : String(error),
    });
    return null;
  }
}

export async function getStoreProducts(productIds: string[] = ALL_PRODUCT_IDS) {
  let Purchases = null;
  try {
    Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, 'RevenueCat initialize');
  } catch (e) {
    const error = e as RevenueCatError;
    rcLog('products', 'INIT ERROR', {
      message: error?.message,
      code: error?.code,
      underlyingErrorMessage: error?.underlyingErrorMessage,
      readableErrorCode: error?.readableErrorCode,
      readable_error_code: error?.readable_error_code,
      domain: error?.domain,
      name: error?.name,
      raw: typeof error === 'object' ? safeJson(error) : String(error),
    });
    return [];
  }
  if (!Purchases) return [];
  try {
    const result = await withTimeout(
      Purchases.getProducts({ productIdentifiers: productIds, type: 'SUBSCRIPTION' }),
      12000,
      'RevenueCat getProducts'
    ) as unknown as RevenueCatProductsResult;
    const products = result?.products ?? [];
    rcLog('products', 'loaded', {
      requested: productIds,
      count: products.length,
      products: products.map(summarizeProduct),
    });
    if (products.length === 0) {
      rcLog('products', 'WARNING: StoreKit returned 0 products. Check Bundle ID, Paid Apps Agreement, product status, and Sandbox tester.');
    }
    return products;
  } catch (e) {
    const error = e as RevenueCatError;
    rcLog('products', 'ERROR', {
      message: error?.message,
      code: error?.code,
      underlyingErrorMessage: error?.underlyingErrorMessage,
      readableErrorCode: error?.readableErrorCode,
      readable_error_code: error?.readable_error_code,
      domain: error?.domain,
      name: error?.name,
      raw: typeof error === 'object' ? safeJson(error) : String(error),
    });
    return [];
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

export const PREMIUM_ENTITLEMENT = 'Daily Dominator AI Pro';

function extractActive(customerInfo?: RevenueCatCustomerInfo): { isPremium: boolean; productId: string | null; expiresAt: string | null } {
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

export async function purchasePackage(pkg: RevenueCatPackage) {
  const log = (label: string, data?: unknown) => {
    rcLog('purchase', label, data);
  };
  try {
    const { data: auth } = await supabase.auth.getUser();
    log('user', { id: auth.user?.id, email: auth.user?.email });
    log('package received', {
      identifier: pkg?.identifier,
      packageType: pkg?.packageType,
      offeringIdentifier: pkg?.offeringIdentifier,
      product: {
        identifier: pkg?.product?.identifier,
        title: pkg?.product?.title,
        priceString: pkg?.product?.priceString,
        currencyCode: pkg?.product?.currencyCode,
      },
    });
    // Validate package shape BEFORE calling StoreKit — a malformed package is a
    // common cause of "unspecified error" rejections from Apple reviewers.
    if (!pkg || !pkg.identifier || !pkg.product?.identifier || !pkg.presentedOfferingContext) {
      log('INVALID PACKAGE — missing identifier or product.identifier', {
        hasPackage: !!pkg,
        identifier: pkg?.identifier,
        productIdentifier: pkg?.product?.identifier,
        hasPresentedOfferingContext: Boolean(pkg?.presentedOfferingContext),
      });
      throw new Error('חבילת המנוי אינה תקינה. נסה לרענן ולנסות שוב.');
    }
    const Purchases = await withTimeout(ensureInit(auth.user?.id), INIT_TIMEOUT_MS, 'RevenueCat initialize');
    if (!Purchases) throw new Error('רכישות זמינות רק באפליקציית iOS');
    log('calling Purchases.purchasePackage...', { productId: pkg.product.identifier, timeoutMs: PURCHASE_TIMEOUT_MS });
    const result: RevenueCatPurchaseResult = await withTimeout(
      Purchases.purchasePackage({ aPackage: pkg as unknown as Parameters<typeof Purchases.purchasePackage>[0]['aPackage'] }),
      PURCHASE_TIMEOUT_MS,
      'RevenueCat purchasePackage'
    );
    log('purchase result', {
      transactionId: result?.transaction?.transactionIdentifier,
      productId: result?.productIdentifier,
      activeEntitlements: Object.keys(result?.customerInfo?.entitlements?.active || {}),
      activeSubscriptions: result?.customerInfo?.activeSubscriptions,
    });
    const info = result.customerInfo;
    const active = extractActive(info);
    log('extracted active', active);
    await syncToSupabase();
    log('synced to backend');
    return active;
  } catch (e) {
    const error = e as RevenueCatError;
    log('ERROR', {
      message: error?.message,
      code: error?.code,
      underlyingErrorMessage: error?.underlyingErrorMessage,
      userCancelled: error?.userCancelled,
      readableErrorCode: error?.readableErrorCode,
      readable_error_code: error?.readable_error_code,
      domain: error?.domain,
      name: error?.name,
      stack: error?.stack,
      raw: typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error),
    });
    throw e;
  }
}

export async function purchaseStoreProduct(product: RevenueCatStoreProduct) {
  const log = (label: string, data?: unknown) => rcLog('purchase-product', label, data);
  try {
    const { data: auth } = await supabase.auth.getUser();
    log('user', { id: auth.user?.id, email: auth.user?.email });
    log('product received', summarizeProduct(product));
    if (!product?.identifier) {
      throw new Error('מוצר המנוי אינו תקין. נסה לרענן ולנסות שוב.');
    }
    const Purchases = await withTimeout(ensureInit(auth.user?.id), INIT_TIMEOUT_MS, 'RevenueCat initialize');
    if (!Purchases) throw new Error('רכישות זמינות רק באפליקציית iOS');
    log('calling Purchases.purchaseStoreProduct...', { productId: product.identifier, timeoutMs: PURCHASE_TIMEOUT_MS });
    const result: RevenueCatPurchaseResult = await withTimeout(
      Purchases.purchaseStoreProduct({ product: product as unknown as Parameters<typeof Purchases.purchaseStoreProduct>[0]['product'] }),
      PURCHASE_TIMEOUT_MS,
      'RevenueCat purchaseStoreProduct'
    );
    log('purchase result', {
      transactionId: result?.transaction?.transactionIdentifier,
      productId: result?.productIdentifier,
      activeEntitlements: Object.keys(result?.customerInfo?.entitlements?.active || {}),
      activeSubscriptions: result?.customerInfo?.activeSubscriptions,
    });
    const active = extractActive(result.customerInfo);
    log('extracted active', active);
    await syncToSupabase();
    log('synced to backend');
    return active;
  } catch (e) {
    const error = e as RevenueCatError;
    log('ERROR', {
      message: error?.message,
      code: error?.code,
      underlyingErrorMessage: error?.underlyingErrorMessage,
      userCancelled: error?.userCancelled,
      readableErrorCode: error?.readableErrorCode,
      readable_error_code: error?.readable_error_code,
      domain: error?.domain,
      name: error?.name,
      stack: error?.stack,
      raw: typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error),
    });
    throw e;
  }
}

export async function restorePurchases() {
  const log = (label: string, data?: unknown) => rcLog('restore', label, data);
  try {
    const { data: auth } = await supabase.auth.getUser();
    log('user', { id: auth.user?.id, email: auth.user?.email });
    const Purchases = await ensureInit(auth.user?.id);
    if (!Purchases) throw new Error('שחזור זמין רק באפליקציית iOS');
    log('calling Purchases.restorePurchases...');
    const result: RevenueCatPurchaseResult = await Purchases.restorePurchases();
    log('restore result', {
      activeEntitlements: Object.keys(result?.customerInfo?.entitlements?.active || {}),
      activeSubscriptions: result?.customerInfo?.activeSubscriptions,
    });
    const info = result.customerInfo;
    const active = extractActive(info);
    log('extracted active', active);
    await syncToSupabase();
    log('synced to backend');
    return active;
  } catch (e) {
    const error = e as RevenueCatError;
    log('ERROR', {
      message: error?.message,
      code: error?.code,
      underlyingErrorMessage: error?.underlyingErrorMessage,
      readableErrorCode: error?.readableErrorCode,
      readable_error_code: error?.readable_error_code,
      domain: error?.domain,
      name: error?.name,
      raw: typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error),
    });
    throw e;
  }
}

export async function refreshPremiumStatus() {
  const { data: auth } = await supabase.auth.getUser();
  const Purchases = await ensureInit(auth.user?.id);
  if (!Purchases) return null;
  try {
    const result: RevenueCatPurchaseResult = await Purchases.getCustomerInfo();
    const info = result.customerInfo;
    const active = extractActive(info);
    await syncToSupabase();
    return active;
  } catch {
    return null;
  }
}

export const isIOSNative = isIOS;
