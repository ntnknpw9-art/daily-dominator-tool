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
let initializePromise: Promise<unknown> | null = null;
let configuredAppUserID: string | null = null;
let lastRevenueCatError: RevenueCatLastError | null = null;
let initializeStartedAt = 0;

// StoreKit 1 is intentionally forced for this iOS build. RevenueCat's DEFAULT
// may select StoreKit 2 on newer iOS versions, which requires RevenueCat's
// App Store Connect In-App Purchase Key setup. StoreKit 1 is the safest path
// for App Review/TestFlight product lookup and avoids StoreKit 2 key issues.
const IOS_STOREKIT_VERSION = 'STOREKIT_1' as const;
const APP_BUILD_MARKER = 'rc-official-sdk-only-2026-06-02-1919';
const INIT_TIMEOUT_MS = 30000;
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

const rcLog = (scope: string, label: string, data?: unknown) => {
  try {
    console.log(`[RC ${scope}] ${label}`, data !== undefined ? safeJson(data) : '');
  } catch {
    console.log(`[RC ${scope}] ${label}`, data);
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
    raw: typeof error === 'object' ? safeJson(error) : String(error),
    at: new Date().toISOString(),
  };
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

type CapacitorWindow = Window & {
  Capacitor?: {
    Plugins?: Record<string, Record<string, (options?: unknown) => Promise<unknown>>>;
    nativePromise?: (pluginName: string, methodName: string, options?: unknown) => Promise<unknown>;
  };
};

type DailyDominatorStoreKitPlugin = {
  diagnostics(): Promise<Record<string, unknown>>;
  getProducts(options: { productIdentifiers: string[] }): Promise<{ products?: NativeStoreKitProduct[] }>;
  purchase(options: { productIdentifier: string }): Promise<NativeStoreKitPurchaseResult>;
};

const DailyDominatorStoreKit = registerPlugin<DailyDominatorStoreKitPlugin>('DailyDominatorStoreKit');

const callNativeStoreKit = async <T,>(methodName: string, options?: unknown): Promise<T> => {
  const registeredMethod = DailyDominatorStoreKit[methodName as keyof DailyDominatorStoreKitPlugin] as
    | ((options?: unknown) => Promise<T>)
    | undefined;
  if (typeof registeredMethod === 'function') {
    return registeredMethod(options);
  }

  const capacitorWindow = window as CapacitorWindow;
  const plugin = capacitorWindow.Capacitor?.Plugins?.DailyDominatorStoreKit;
  const method = plugin?.[methodName];
  if (typeof method === 'function') return method(options) as Promise<T>;
  if (typeof capacitorWindow.Capacitor?.nativePromise === 'function') {
    return capacitorWindow.Capacitor.nativePromise('DailyDominatorStoreKit', methodName, options) as Promise<T>;
  }
  throw new Error('DailyDominatorStoreKit native plugin is unavailable. Run npx cap sync ios and archive a fresh build.');
};

async function ensureInit(userId?: string) {
  if (!isIOS()) return null;
  if (!REVENUECAT_IOS_API_KEY) {
    rcLog('init', 'NO API KEY configured');
    return null;
  }
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  if (!initialized) {
    if (initializePromise && initializeStartedAt && Date.now() - initializeStartedAt > INIT_TIMEOUT_MS + 2000) {
      rcLog('init', 'discarding stale initialize promise before retry', {
        elapsedMs: Date.now() - initializeStartedAt,
        timeoutMs: INIT_TIMEOUT_MS,
      });
      initializePromise = null;
      initializeStartedAt = 0;
    }
    if (!initializePromise) {
      const keyPrefix = REVENUECAT_IOS_API_KEY.slice(0, 10);
      const keyLooksValid = REVENUECAT_IOS_API_KEY.startsWith('appl_');
      rcLog('init', 'configuring RevenueCat', {
        ...getRevenueCatClientConfig(),
        apiKeyPrefix: keyPrefix,
        appUserID: userId ?? '(anonymous)',
      });
      if (!keyLooksValid) {
        rcLog('init', 'WARNING: API key does NOT start with "appl_" — this may be an Android (goog_) or Web (rcb_) key!');
      }
      initializeStartedAt = Date.now();
      initializePromise = (async () => {
        try {
          void Promise.resolve(Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE })).catch((e) => {
            rcLog('init', 'setLogLevel failed but continuing', e);
          });
        } catch (e) {
          rcLog('init', 'setLogLevel failed but continuing', e);
        }
        await withTimeout(
          Purchases.configure({
            apiKey: REVENUECAT_IOS_API_KEY,
            appUserID: userId,
            storeKitVersion: IOS_STOREKIT_VERSION,
            diagnosticsEnabled: true,
            preferredUILocaleOverride: 'he-IL',
          } as never),
          INIT_TIMEOUT_MS,
          'RevenueCat configure'
        );
        initialized = true;
        configuredAppUserID = userId ?? null;
        rcLog('init', 'configure resolved', { storeKitVersion: IOS_STOREKIT_VERSION });
        void Promise.allSettled([
          withTimeout(Purchases.isConfigured(), 3000, 'RevenueCat post-config isConfigured'),
          withTimeout(Purchases.getAppUserID(), 3000, 'RevenueCat post-config getAppUserID'),
        ]).then(([configured, appUser]) => {
          rcLog('init', 'post-config identity diagnostic', {
            configured: configured.status === 'fulfilled' ? configured.value : configured.reason?.message,
            appUserID: appUser.status === 'fulfilled' ? appUser.value?.appUserID : appUser.reason?.message,
            storeKitVersion: IOS_STOREKIT_VERSION,
          });
        });
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
  } else if (userId && configuredAppUserID !== userId) {
    try {
      const result = await Purchases.logIn({ appUserID: userId });
      configuredAppUserID = userId;
      rcLog('init', 'logIn OK', { appUserID: userId, created: result?.created });
    } catch (e) {
      rememberRevenueCatError('logIn', e);
      rcLog('init', 'logIn failed', e);
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
  const diagnostics: Record<string, unknown> = {};
  diagnostics.timeoutMs = RUNTIME_DIAGNOSTIC_TIMEOUT_MS;
  try { diagnostics.isConfigured = await withTimeout(Purchases.isConfigured(), RUNTIME_DIAGNOSTIC_TIMEOUT_MS, 'RevenueCat isConfigured'); } catch (e) { diagnostics.isConfiguredError = rememberRevenueCatError('isConfigured', e); }
  try { diagnostics.appUserID = (await withTimeout(Purchases.getAppUserID(), RUNTIME_DIAGNOSTIC_TIMEOUT_MS, 'RevenueCat getAppUserID'))?.appUserID; } catch (e) { diagnostics.appUserIDError = rememberRevenueCatError('getAppUserID', e); }
  try { diagnostics.storefront = await withTimeout(Purchases.getStorefront(), RUNTIME_DIAGNOSTIC_TIMEOUT_MS, 'RevenueCat getStorefront'); } catch (e) { diagnostics.storefrontError = rememberRevenueCatError('getStorefront', e); }
  diagnostics.elapsedMs = Date.now() - start;
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
  let Purchases = null;
  try {
    Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, 'RevenueCat initialize');
  } catch (e) {
    const remembered = rememberRevenueCatError('RevenueCat initialize before getOfferings', e);
    rcLog('offerings', 'INIT ERROR', remembered);
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
    const start = Date.now();
    const offerings = await withTimeout(Purchases.getOfferings(), STOREKIT_FETCH_TIMEOUT_MS, 'RevenueCat getOfferings') as unknown as RevenueCatOfferings;
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
      elapsedMs: Date.now() - start,
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
      rcLog('offerings', 'WARNING: Current offering has 0 packages. StoreKit did not return products to RevenueCat. Check Apple product availability, Paid Apps Agreement, Bundle ID, Sandbox tester, and product status.');
    }
    return current;
  } catch (e) {
    const remembered = rememberRevenueCatError('RevenueCat getOfferings', e);
    rcLog('offerings', 'ERROR', remembered);
    return null;
  }
}

export async function getStoreProducts(productIds: string[] = ALL_PRODUCT_IDS) {
  let Purchases = null;
  try {
    Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, 'RevenueCat initialize');
  } catch (e) {
    const remembered = rememberRevenueCatError('RevenueCat initialize before getProducts', e);
    rcLog('products', 'INIT ERROR', remembered);
    return getNativeStoreKitProducts(productIds);
  }
  if (!Purchases) return getNativeStoreKitProducts(productIds);
  try {
    const start = Date.now();
    const result = await withTimeout(
      Purchases.getProducts({ productIdentifiers: productIds }),
      STOREKIT_FETCH_TIMEOUT_MS,
      'RevenueCat getProducts'
    ) as unknown as RevenueCatProductsResult;
    const products = result?.products ?? [];
    rcLog('products', 'loaded', {
      elapsedMs: Date.now() - start,
      requested: productIds,
      count: products.length,
      products: products.map(summarizeProduct),
    });
    if (products.length === 0) {
      rcLog('products', 'WARNING: StoreKit returned 0 products. Check Bundle ID, Paid Apps Agreement, product status, and Sandbox tester.');
      return getNativeStoreKitProducts(productIds);
    }
    return products;
  } catch (e) {
    const remembered = rememberRevenueCatError('RevenueCat getProducts', e);
    rcLog('products', 'ERROR', remembered);
    return getNativeStoreKitProducts(productIds);
  }
}

export async function getNativeStoreKitDiagnostics() {
  if (!isIOS()) return null;
  try {
    return await withTimeout(
      callNativeStoreKit<Record<string, unknown>>('diagnostics'),
      NATIVE_STOREKIT_TIMEOUT_MS,
      'Native StoreKit diagnostics'
    );
  } catch (e) {
    rememberRevenueCatError('Native StoreKit diagnostics', e);
    return null;
  }
}

export async function getNativeStoreKitProducts(productIds: string[] = ALL_PRODUCT_IDS) {
  if (!isIOS()) return [] as NativeStoreKitProduct[];
  try {
    const start = Date.now();
    const result = await withTimeout(
      callNativeStoreKit<{ products?: NativeStoreKitProduct[] }>('getProducts', { productIdentifiers: productIds }),
      NATIVE_STOREKIT_TIMEOUT_MS,
      'Native StoreKit getProducts'
    );
    const products = (result?.products ?? []).map((product) => ({
      ...product,
      source: 'native-storekit' as const,
      priceString: product.priceString || product.displayPrice,
      title: product.title || product.displayName,
    }));
    rcLog('native-storekit', 'products loaded', {
      elapsedMs: Date.now() - start,
      requested: productIds,
      count: products.length,
      products: products.map(summarizeProduct),
    });
    return products;
  } catch (e) {
    const remembered = rememberRevenueCatError('Native StoreKit getProducts', e);
    rcLog('native-storekit', 'products ERROR', remembered);
    return [] as NativeStoreKitProduct[];
  }
}

export async function purchaseNativeStoreKitProduct(productIdentifier: string) {
  const log = (label: string, data?: unknown) => rcLog('native-purchase', label, data);
  if (!isIOS()) throw new Error('רכישות זמינות רק באפליקציית iOS');
  try {
    const result = await withTimeout(
      callNativeStoreKit<NativeStoreKitPurchaseResult>('purchase', { productIdentifier }),
      PURCHASE_TIMEOUT_MS,
      'Native StoreKit purchase'
    );
    log('purchase result', result);
    if (result?.status === 'cancelled') {
      const error = new Error('המשתמש ביטל את הרכישה') as RevenueCatError;
      error.userCancelled = true;
      throw error;
    }
    try {
      const { data: auth } = await supabase.auth.getUser();
      const Purchases = await withTimeout(ensureInit(auth.user?.id), 5000, 'RevenueCat initialize after native purchase');
      await withTimeout(Purchases.syncPurchases(), 15000, 'RevenueCat syncPurchases after native purchase');
      const customerInfo = await withTimeout(Purchases.getCustomerInfo(), 15000, 'RevenueCat getCustomerInfo after native purchase') as RevenueCatPurchaseResult;
      const active = extractActive(customerInfo.customerInfo);
      await syncToSupabase();
      return active;
    } catch (e) {
      rememberRevenueCatError('RevenueCat sync after native purchase', e);
      await syncToSupabase();
      return { isPremium: true, productId: productIdentifier, expiresAt: null };
    }
  } catch (e) {
    rememberRevenueCatError('Native StoreKit purchase', e);
    log('ERROR', e);
    throw e;
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
    if (!pkg || !pkg.identifier || !pkg.product?.identifier) {
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
  let Purchases = null;
  try {
    Purchases = await withTimeout(ensureInit(auth.user?.id), INIT_TIMEOUT_MS, 'RevenueCat initialize before getCustomerInfo');
  } catch (e) {
    rememberRevenueCatError('RevenueCat initialize before getCustomerInfo', e);
    return null;
  }
  if (!Purchases) return null;
  try {
    const result: RevenueCatPurchaseResult = await withTimeout(
      Purchases.getCustomerInfo(),
      STOREKIT_FETCH_TIMEOUT_MS,
      'RevenueCat getCustomerInfo'
    );
    const info = result.customerInfo;
    const active = extractActive(info);
    await syncToSupabase();
    return active;
  } catch {
    return null;
  }
}

export const isIOSNative = isIOS;
