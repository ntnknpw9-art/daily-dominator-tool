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
  details?: unknown;
};

const errorDebug = (error: unknown) => {
  const e = error as RevenueCatError;
  let raw: string;
  try {
    raw = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
  } catch {
    raw = String(error);
  }
  return {
    message: e?.message ?? String(error),
    code: e?.code,
    underlyingErrorMessage: e?.underlyingErrorMessage,
    userCancelled: e?.userCancelled,
    readableErrorCode: e?.readableErrorCode,
    readable_error_code: e?.readable_error_code,
    domain: e?.domain,
    name: e?.name,
    details: e?.details,
    stack: e?.stack,
    raw,
  };
};

type RevenueCatLastError = {
  operation: string;
  message?: string;
  code?: string | number;
  underlyingErrorMessage?: string;
  readableErrorCode?: string;
  readable_error_code?: string;
  domain?: string;
  name?: string;
  elapsedMs?: number;
  raw?: string;
  at: string;
};

export const PRODUCTS = {
  monthly: {
    id: 'premium_monthly',
    label: 'תמיכה חודשית',
    period: 'month' as const,
  },
  yearly: {
    id: 'premium_yearly',
    label: 'תמיכה שנתית',
    period: 'year' as const,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
export const ALL_PRODUCT_IDS = Object.values(PRODUCTS).map((p) => p.id);

export const PRODUCT_MONTHLY = PRODUCTS.monthly.id;
export const PRODUCT_YEARLY = PRODUCTS.yearly.id;

export const getProductById = (id: string | null | undefined) =>
  Object.values(PRODUCTS).find((p) => p.id === id) ?? null;

const REVENUECAT_IOS_API_KEY = import.meta.env?.VITE_REVENUECAT_IOS_API_KEY || 'appl_FjjpXFIxixSDQVCgXkqwTSSKmVR';

let initialized = false;
let initializePromise: Promise<unknown> | null = null;
let configuredAppUserID: string | null = null;
let lastRevenueCatError: RevenueCatLastError | null = null;
let initializeStartedAt = 0;

const IOS_STOREKIT_VERSION = 'DEFAULT' as const;
const APP_BUILD_MARKER = 'rc-verified-native-configure-2026-08-14';
const INIT_TIMEOUT_MS = 30000;
const CONFIGURE_TIMEOUT_MS = 10000;
const STOREKIT_FETCH_TIMEOUT_MS = 60000;
const PURCHASE_TIMEOUT_MS = 120000;
const RUNTIME_DIAGNOSTIC_TIMEOUT_MS = 6000;
const REST_SNAPSHOT_TIMEOUT_MS = 10000;

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export type RcTraceEntry = {
  at: string;
  tMs: number;
  scope: string;
  label: string;
  data?: string;
};
const RC_TRACE_MAX = 200;
let rcTraceBuffer: RcTraceEntry[] = [];
let rcTraceStartedAt = Date.now();
const rcTraceListeners = new Set<() => void>();

export const getRevenueCatInitTrace = (): RcTraceEntry[] => rcTraceBuffer.slice();
export const clearRevenueCatInitTrace = () => {
  rcTraceBuffer = [];
  rcTraceStartedAt = Date.now();
  rcTraceListeners.forEach((l) => { try { l(); } catch {} });
};
export const subscribeRevenueCatInitTrace = (listener: () => void) => {
  rcTraceListeners.add(listener);
  return () => { rcTraceListeners.delete(listener); };
};

const rcLog = (scope: string, label: string, data?: unknown) => {
  const entry: RcTraceEntry = {
    at: new Date().toISOString(),
    tMs: Date.now() - rcTraceStartedAt,
    scope,
    label,
    data: data !== undefined ? safeJson(data) : undefined,
  };
  if (rcTraceBuffer.length >= RC_TRACE_MAX) rcTraceBuffer.shift();
  rcTraceBuffer.push(entry);
  rcTraceListeners.forEach((l) => { try { l(); } catch {} });
  try {
    console.log(`[SUBSCRIPTION DEBUG][RC ${scope}] ${label}`, data !== undefined ? safeJson({
      at: entry.at,
      platform: Capacitor.getPlatform(),
      native: Capacitor.isNativePlatform(),
      data,
    }) : '');
  } catch {
    console.log(`[SUBSCRIPTION DEBUG][RC ${scope}] ${label}`, data);
  }
};

const rememberRevenueCatError = (operation: string, error: unknown, elapsedMs?: number) => {
  const e = error as RevenueCatError;
  lastRevenueCatError = {
    operation,
    message: e?.message ?? String(error),
    code: e?.code,
    underlyingErrorMessage: e?.underlyingErrorMessage,
    readableErrorCode: e?.readableErrorCode,
    readable_error_code: e?.readable_error_code,
    domain: e?.domain,
    name: e?.name,
    elapsedMs,
    raw: typeof error === 'object' ? safeJson(errorDebug(error)) : String(error),
    at: new Date().toISOString(),
  };
  console.error(`[SUBSCRIPTION DEBUG][RC ERROR] ${operation}`, lastRevenueCatError);
  return lastRevenueCatError;
};

export const getLastRevenueCatError = () => lastRevenueCatError;

export const getRevenueCatClientConfig = () => ({
  platform: Capacitor.getPlatform(),
  isNative: Capacitor.isNativePlatform(),
  isIOSNative: isIOS(),
  buildMarker: APP_BUILD_MARKER,
  apiKeyPrefix: REVENUECAT_IOS_API_KEY.slice(0, 10),
  apiKeyLength: REVENUECAT_IOS_API_KEY.length,
  apiKeyLooksLikeIOS: REVENUECAT_IOS_API_KEY.startsWith('appl_'),
  storeKitVersion: IOS_STOREKIT_VERSION,
  initTimeoutMs: INIT_TIMEOUT_MS,
  configureTimeoutMs: CONFIGURE_TIMEOUT_MS,
  storeKitFetchTimeoutMs: STOREKIT_FETCH_TIMEOUT_MS,
  purchaseTimeoutMs: PURCHASE_TIMEOUT_MS,
  runtimeDiagnosticTimeoutMs: RUNTIME_DIAGNOSTIC_TIMEOUT_MS,
  restSnapshotTimeoutMs: REST_SNAPSHOT_TIMEOUT_MS,
  expectedBundleId: 'com.natanknafo.app',
  expectedDefaultOfferingId: 'default',
  expectedPackages: ['$rc_monthly', '$rc_annual'],
  expectedProductIds: ALL_PRODUCT_IDS,
});

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`${label} timed out after ${ms}ms`) as RevenueCatError;
      error.code = 'LOVABLE_TIMEOUT';
      reject(error);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

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
    if (!initializePromise) {
      initializeStartedAt = Date.now();
      initializePromise = (async () => {
        // EXACTLY like the standalone paywall that works: configure with the
        // API key only. No appUserID, no extra options — anything else can make
        // the native bridge hang before offerings are fetched.
        await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY } as never);
        initialized = true;
        configuredAppUserID = null;
        rcLog('init', 'configure ok');
        // Best-effort extras — never block offerings on these.
        Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE }).catch(() => {});
      })();
    }
    try {
      await initializePromise;
    } catch (e) {
      initialized = false;
      initializePromise = null;
      initializeStartedAt = 0;
      rememberRevenueCatError('RevenueCat configure', e);
      throw e;
    }
  }

  if (userId && configuredAppUserID !== userId) {
    // Identify the user in the background — offerings/purchases must not wait.
    configuredAppUserID = userId;
    Purchases.logIn({ appUserID: userId }).catch((e) => {
      configuredAppUserID = null;
      rememberRevenueCatError('logIn', e);
    });
  }

  return Purchases;
}


export async function getRevenueCatRuntimeDiagnostics() {
  const start = Date.now();
  const Purchases = await withTimeout(
    ensureInit(),
    RUNTIME_DIAGNOSTIC_TIMEOUT_MS,
    'RevenueCat runtime diagnostics initialize'
  );
  if (!Purchases) return null;
  const diagnostics: Record<string, unknown> = {
    timeoutMs: RUNTIME_DIAGNOSTIC_TIMEOUT_MS,
    elapsedMs: Date.now() - start
  };
  return diagnostics;
}

export async function getRevenueCatRemoteOfferingSnapshot() {
  const appUserId = configuredAppUserID || `diagnostics-${Date.now()}`;
  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/offerings`;
  const start = Date.now();
  try {
    const response = await withTimeout(fetch(url, {
      headers: {
        Authorization: `Bearer ${REVENUECAT_IOS_API_KEY}`,
        'X-Platform': 'ios',
      },
    }), REST_SNAPSHOT_TIMEOUT_MS, 'RevenueCat REST offerings snapshot');
    const body = await response.json().catch(() => null);
    const defaultOffering = Array.isArray(body?.offerings)
      ? body.offerings.find((offering: { identifier?: string }) => offering?.identifier === 'default')
      : null;
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - start,
      currentOfferingId: body?.current_offering_id ?? null,
      offeringIds: Array.isArray(body?.offerings) ? body.offerings.map((o: { identifier?: string }) => o?.identifier) : [],
      defaultPackages: Array.isArray(defaultOffering?.packages) ? defaultOffering.packages : [],
      raw: body,
    };
  } catch (e) {
    rememberRevenueCatError('RevenueCat REST offerings snapshot', e, Date.now() - start);
    return {
      ok: false,
      status: undefined,
      elapsedMs: Date.now() - start,
      currentOfferingId: null,
      offeringIds: [],
      defaultPackages: [],
      raw: null,
      error: getLastRevenueCatError(),
    };
  }
}

let cachedOffering: RevenueCatOffering | null = null;
let cachedProducts: RevenueCatStoreProduct[] = [];
let warmupPromise: Promise<void> | null = null;

export async function getOfferings() {
  try {
    const Purchases = await ensureInit();
    if (!Purchases) return null;
    const offerings = await Purchases.getOfferings() as unknown as RevenueCatOfferings;
    const allOfferings = offerings?.all ?? {};
    const current = offerings?.current ?? allOfferings.default ?? Object.values(allOfferings)[0] ?? null;
    rcLog('offerings', 'loaded', {
      currentId: current?.identifier,
      packages: current?.availablePackages?.length ?? 0,
      allIds: Object.keys(allOfferings),
    });
    if (current) cachedOffering = current;
    return current ?? cachedOffering;
  } catch (e) {
    rememberRevenueCatError('RevenueCat getOfferings', e);
    return cachedOffering;
  }
}

export function getCachedOffering() {
  return cachedOffering;
}

export function getCachedProducts() {
  return cachedProducts;
}

export async function getStoreProducts(productIds: string[] = ALL_PRODUCT_IDS) {
  try {
    const Purchases = await ensureInit();
    if (!Purchases) return [];
    const result = await Purchases.getProducts({ productIdentifiers: productIds }) as unknown as RevenueCatProductsResult;
    rcLog('products', 'loaded', { count: result?.products?.length ?? 0 });
    const products = result?.products ?? [];
    if (products.length) cachedProducts = products;
    return products.length ? products : cachedProducts;
  } catch (e) {
    rememberRevenueCatError('RevenueCat getProducts', e);
    return cachedProducts;
  }
}

/**
 * Warm the StoreKit catalog at app launch so tapping "Subscribe" is instant.
 * StoreKit's first product request can take 15-20s on a cold start; doing it
 * up-front means the dialog reads from cache.
 */
export function warmupRevenueCat() {
  if (!isIOS()) return Promise.resolve();
  if (warmupPromise) return warmupPromise;
  warmupPromise = (async () => {
    try {
      await getOfferings();
      if (!cachedOffering?.availablePackages?.length) {
        await getStoreProducts();
      }
    } catch {
      warmupPromise = null;
    }
  })();
  return warmupPromise;
}



async function syncToSupabase() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.functions.invoke('sync-subscription');
  } catch (e) {
    console.error('[RC sync] error', e);
  }
}

export const PREMIUM_ENTITLEMENT = 'PRO';

function extractActive(customerInfo?: RevenueCatCustomerInfo): { isPremium: boolean; productId: string | null; expiresAt: string | null } {
  const active = customerInfo?.entitlements?.active || {};
  // Match the configured entitlement first, then common aliases, then ANY active
  // entitlement — so a dashboard rename can never lock a paying user out.
  const premium =
    active[PREMIUM_ENTITLEMENT] ||
    active['premium'] ||
    active['pro'] ||
    Object.values(active)[0];
  rcLog('entitlement', 'extractActive', {
    expectedEntitlement: PREMIUM_ENTITLEMENT,
    activeEntitlementIds: Object.keys(active),
    matched: Boolean(premium),
  });
  if (premium) {
    return { isPremium: true, productId: premium?.productIdentifier ?? null, expiresAt: premium?.expirationDate ?? null };
  }

  return { isPremium: false, productId: null, expiresAt: null };
}

export async function purchasePackage(pkg: RevenueCatPackage) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const Purchases = await ensureInit(auth.user?.id);
    if (!Purchases) throw new Error('iOS only');
    const result: RevenueCatPurchaseResult = await Purchases.purchasePackage({ aPackage: pkg as any });
    const active = extractActive(result.customerInfo);
    await syncToSupabase();
    return active;
  } catch (e) {
    rememberRevenueCatError('purchasePackage', e);
    throw e;
  }
}

export async function purchaseStoreProduct(product: RevenueCatStoreProduct) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const Purchases = await ensureInit(auth.user?.id);
    if (!Purchases) throw new Error('iOS only');
    const result: RevenueCatPurchaseResult = await Purchases.purchaseStoreProduct({ product: product as any });
    const active = extractActive(result.customerInfo);
    await syncToSupabase();
    return active;
  } catch (e) {
    rememberRevenueCatError('purchaseStoreProduct', e);
    throw e;
  }
}


export async function restorePurchases() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const Purchases = await ensureInit(auth.user?.id);
    if (!Purchases) throw new Error('iOS only');
    const result: RevenueCatPurchaseResult = await Purchases.restorePurchases();
    const active = extractActive(result.customerInfo);
    await syncToSupabase();
    return active;
  } catch (e) {
    rememberRevenueCatError('restorePurchases', e);
    throw e;
  }
}

export async function refreshPremiumStatus() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const Purchases = await ensureInit(auth.user?.id);
    if (!Purchases) return null;
    const result: RevenueCatPurchaseResult = await Purchases.getCustomerInfo();
    const active = extractActive(result.customerInfo);
    await syncToSupabase();
    return active;
  } catch (e) {
    rememberRevenueCatError('getCustomerInfo', e);
    return null;
  }
}

export const isIOSNative = isIOS;

// Clears the RevenueCat identity so a purchase never leaks to the next user
// signing in on the same device.
export async function logOutRevenueCat() {
  try {
    if (!isIOS() || !initialized) return;
    const Purchases = await ensureInit();
    if (!Purchases) return;
    await Purchases.logOut();
    configuredAppUserID = null;
    rcLog('auth', 'logOut done');
  } catch (e) {
    rememberRevenueCatError('logOut', e);
  }
}
