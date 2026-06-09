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

export const PRODUCT_MONTHLY = PRODUCTS.monthly.id;
export const PRODUCT_YEARLY = PRODUCTS.yearly.id;

export const getProductById = (id: string | null | undefined) =>
  Object.values(PRODUCTS).find((p) => p.id === id) ?? null;

const REVENUECAT_IOS_API_KEY = import.meta.env?.VITE_REVENUECAT_IOS_API_KEY || 'appl_OsIuxnzzmIfeIVgsxDoYxxuxgDF';

let initialized = false;
let initializePromise: Promise<unknown> | null = null;
let configuredAppUserID: string | null = null;
let lastRevenueCatError: RevenueCatLastError | null = null;
let initializeStartedAt = 0;

const IOS_STOREKIT_VERSION = 'STOREKIT_1' as const;
const APP_BUILD_MARKER = 'rc-init-trace-ui-2026-06-09';
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
  expectedBundleId: 'com.natanknafo.dailydominator',
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
  rcLog('init-trace', 'ensureInit entered', { userId: userId ?? '(anonymous)' });
  if (!isIOS()) return null;
  if (!REVENUECAT_IOS_API_KEY) {
    rcLog('init', 'NO API KEY configured');
    return null;
  }
  rcLog('init-trace', 'before import @revenuecat/purchases-capacitor');
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  rcLog('init-trace', 'after import @revenuecat/purchases-capacitor', {
    hasPurchases: Boolean(Purchases),
    hasConfigure: typeof Purchases?.configure === 'function',
    hasIsConfigured: typeof Purchases?.isConfigured === 'function',
    hasGetAppUserID: typeof Purchases?.getAppUserID === 'function',
    hasGetStorefront: typeof Purchases?.getStorefront === 'function',
  });
  if (!initialized) {
    if (initializePromise && initializeStartedAt && Date.now() - initializeStartedAt > INIT_TIMEOUT_MS + 2000) {
      rcLog('init-trace', 'discarding stale initializePromise', {
        elapsedMs: Date.now() - initializeStartedAt,
      });
      initializePromise = null;
      initializeStartedAt = 0;
    }
    if (!initializePromise) {
      initializeStartedAt = Date.now();
      initializePromise = (async () => {
        try {
          rcLog('init-trace', 'before configure', {
            storeKitVersion: IOS_STOREKIT_VERSION,
            appUserID: userId ?? '(anonymous)',
          });
          await withTimeout(
            Purchases.configure({
              apiKey: REVENUECAT_IOS_API_KEY,
              appUserID: userId,
              storeKitVersion: IOS_STOREKIT_VERSION,
            } as never),
            CONFIGURE_TIMEOUT_MS,
            'RevenueCat configure'
          );
          rcLog('init-trace', 'after configure');
        } catch (e) {
          rcLog('init-trace', 'configure threw/timed out; before isConfigured fallback', errorDebug(e));
          const postTimeoutConfigured = await withTimeout(
            Purchases.isConfigured(),
            3000,
            'RevenueCat isConfigured after configure timeout'
          ).catch(() => null);
          rcLog('init-trace', 'after isConfigured fallback', postTimeoutConfigured);
          if (!postTimeoutConfigured?.isConfigured) {
            throw e;
          }
        }
        rcLog('init-trace', 'before isConfigured post-config');
        const configuredStatus = await withTimeout(
          Purchases.isConfigured(),
          3000,
          'RevenueCat isConfigured post-config trace'
        );
        rcLog('init-trace', 'after isConfigured post-config', configuredStatus);
        rcLog('init-trace', 'before getAppUserID');
        const appUserID = await withTimeout(
          Purchases.getAppUserID(),
          3000,
          'RevenueCat getAppUserID post-config trace'
        );
        rcLog('init-trace', 'after getAppUserID', appUserID);
        rcLog('init-trace', 'before getStorefront');
        const storefront = await withTimeout(
          Purchases.getStorefront(),
          3000,
          'RevenueCat getStorefront post-config trace'
        );
        rcLog('init-trace', 'after getStorefront', storefront);
        initialized = true;
        void Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE }).catch(() => {});
        configuredAppUserID = userId ?? null;
      })();
    }
    try {
      rcLog('init-trace', 'before await initializePromise');
      await initializePromise;
      rcLog('init-trace', 'after await initializePromise');
    } catch (e) {
      rcLog('init-trace', 'initializePromise rejected', errorDebug(e));
      initialized = false;
      initializePromise = null;
      initializeStartedAt = 0;
      rememberRevenueCatError('RevenueCat configure', e);
      throw e;
    }
  } else if (userId && configuredAppUserID !== userId) {
    try {
      rcLog('init-trace', 'before logIn', { appUserID: userId });
      const result = await Purchases.logIn({ appUserID: userId });
      rcLog('init-trace', 'after logIn', result);
      configuredAppUserID = userId;
    } catch (e) {
      rememberRevenueCatError('logIn', e);
    }
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

export async function getOfferings() {
  try {
    const Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, 'RevenueCat initialize');
    if (!Purchases) return null;
    const start = Date.now();
    const offerings = await withTimeout(Purchases.getOfferings(), STOREKIT_FETCH_TIMEOUT_MS, 'RevenueCat getOfferings') as unknown as RevenueCatOfferings;
    const allOfferings = offerings?.all ?? {};
    const defaultOffering = allOfferings.default ?? null;
    const current = defaultOffering ?? offerings?.current ?? null;
    return current;
  } catch (e) {
    rememberRevenueCatError('RevenueCat getOfferings', e);
    return null;
  }
}

export async function getStoreProducts(productIds: string[] = ALL_PRODUCT_IDS) {
  try {
    const Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, 'RevenueCat initialize');
    if (!Purchases) return [];
    const start = Date.now();
    const result = await withTimeout(
      Purchases.getProducts({ productIdentifiers: productIds }),
      STOREKIT_FETCH_TIMEOUT_MS,
      'RevenueCat getProducts'
    ) as unknown as RevenueCatProductsResult;
    return result?.products ?? [];
  } catch (e) {
    rememberRevenueCatError('RevenueCat getProducts', e);
    return [];
  }
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

export const PREMIUM_ENTITLEMENT = 'Daily Dominator AI Pro';

function extractActive(customerInfo?: RevenueCatCustomerInfo): { isPremium: boolean; productId: string | null; expiresAt: string | null } {
  const active = customerInfo?.entitlements?.active || {};
  const premium = active[PREMIUM_ENTITLEMENT];
  if (premium) {
    return { isPremium: true, productId: premium?.productIdentifier ?? null, expiresAt: premium?.expirationDate ?? null };
  }
  return { isPremium: false, productId: null, expiresAt: null };
}

export async function purchasePackage(pkg: RevenueCatPackage) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const Purchases = await withTimeout(ensureInit(auth.user?.id), INIT_TIMEOUT_MS, 'RevenueCat initialize');
    if (!Purchases) throw new Error('iOS only');
    const result: RevenueCatPurchaseResult = await withTimeout(
      Purchases.purchasePackage({ aPackage: pkg as any }),
      PURCHASE_TIMEOUT_MS,
      'RevenueCat purchasePackage'
    );
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
    const Purchases = await withTimeout(ensureInit(auth.user?.id), INIT_TIMEOUT_MS, 'RevenueCat initialize');
    if (!Purchases) throw new Error('iOS only');
    const result: RevenueCatPurchaseResult = await withTimeout(
      Purchases.purchaseStoreProduct({ product: product as any }),
      PURCHASE_TIMEOUT_MS,
      'RevenueCat purchaseStoreProduct'
    );
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
