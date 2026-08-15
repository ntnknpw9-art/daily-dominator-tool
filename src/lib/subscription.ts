// =============================================================
// Subscription layer (RevenueCat) — iOS native only.
// Mirrors the standalone paywall implementation that works:
//  - dynamic plugin import (never crashes web/SSR)
//  - single merged configure() promise
//  - prices ALWAYS come from the store, never hardcoded
// =============================================================

export const MONTHLY_PRODUCT_ID = 'premium_monthly';
export const YEARLY_PRODUCT_ID = 'premium_yearly';
export const ENTITLEMENT_ID = 'premium';
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

// `appl_` keys are publishable — safe to ship in the bundle.
const API_KEY =
  (import.meta.env?.VITE_REVENUECAT_IOS_API_KEY as string | undefined) ||
  'appl_FjjpXFIxixSDQVCgXkqwTSSKmVR';

export class StoreUnavailableError extends Error {
  constructor(message = 'החנות אינה זמינה במכשיר הזה') {
    super(message);
    this.name = 'StoreUnavailableError';
  }
}

export class MissingApiKeyError extends Error {
  constructor(message = 'חסר מפתח RevenueCat (VITE_REVENUECAT_IOS_API_KEY)') {
    super(message);
    this.name = 'MissingApiKeyError';
  }
}

export type PlanOption = {
  packageIdentifier: string;
  productIdentifier: string;
  priceString: string;
  price: number;
  currencyCode: string;
  period: 'month' | 'year' | 'other';
  storeUnavailable?: boolean;
};

export type SubscriptionState = {
  plans: PlanOption[];
  isSubscribed: boolean;
  renewsAt: string | null;
  storeUnavailable: boolean;
};

// Browser-only preview data so the design can be reviewed outside iOS.
export const PREVIEW_PLANS: PlanOption[] = [
  {
    packageIdentifier: '$rc_annual',
    productIdentifier: YEARLY_PRODUCT_ID,
    priceString: '₪179.90',
    price: 179.9,
    currencyCode: 'ILS',
    period: 'year',
    storeUnavailable: true,
  },
  {
    packageIdentifier: '$rc_monthly',
    productIdentifier: MONTHLY_PRODUCT_ID,
    priceString: '₪39.90',
    price: 39.9,
    currencyCode: 'ILS',
    period: 'month',
    storeUnavailable: true,
  },
];

type AnyRecord = Record<string, any>;

let configurePromise: Promise<AnyRecord> | null = null;

async function loadPlugin(): Promise<AnyRecord | null> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const mod = await import('@revenuecat/purchases-capacitor');
    return (mod as AnyRecord).Purchases ?? null;
  } catch {
    return null;
  }
}

async function ensureConfigured(): Promise<AnyRecord> {
  const Purchases = await loadPlugin();
  if (!Purchases) throw new StoreUnavailableError();
  if (!API_KEY) throw new MissingApiKeyError();
  if (!configurePromise) {
    configurePromise = (async () => {
      await Purchases.configure({ apiKey: API_KEY });
      return Purchases;
    })().catch((e) => {
      configurePromise = null;
      throw e;
    });
  }
  return configurePromise;
}

export async function isStoreAvailable() {
  return (await loadPlugin()) !== null;
}

const periodOf = (pkg: AnyRecord): PlanOption['period'] => {
  const raw = `${pkg?.identifier ?? ''} ${pkg?.packageType ?? ''}`.toLowerCase();
  const sp = pkg?.product?.subscriptionPeriod;
  const spText = typeof sp === 'string' ? sp.toLowerCase() : String(sp?.unit ?? '').toLowerCase();
  if (raw.includes('annual') || raw.includes('year') || spText.includes('year') || spText === 'y') return 'year';
  if (raw.includes('month') || spText.includes('month') || spText === 'm') return 'month';
  return 'other';
};

const toPlan = (pkg: AnyRecord): PlanOption => ({
  packageIdentifier: pkg?.identifier ?? '',
  productIdentifier: pkg?.product?.identifier ?? '',
  priceString: pkg?.product?.priceString ?? '',
  price: Number(pkg?.product?.price ?? 0),
  currencyCode: pkg?.product?.currencyCode ?? 'ILS',
  period: periodOf(pkg),
});

const readEntitlement = (customerInfo: AnyRecord | undefined) => {
  const active = customerInfo?.entitlements?.active ?? {};
  const ent =
    active[ENTITLEMENT_ID] || active.PRO || active.pro || Object.values(active)[0];
  return {
    isSubscribed: Boolean(ent),
    renewsAt: (ent as AnyRecord)?.expirationDate ?? null,
  };
};

export async function loadSubscriptionState(): Promise<SubscriptionState> {
  const Purchases = await ensureConfigured();
  const [offeringsRes, customerRes] = await Promise.all([
    Purchases.getOfferings(),
    Purchases.getCustomerInfo(),
  ]);

  const all = offeringsRes?.all ?? {};
  const current = offeringsRes?.current ?? all.default ?? Object.values(all)[0] ?? null;
  let plans: PlanOption[] = ((current as AnyRecord)?.availablePackages ?? []).map(toPlan);

  // Fallback: offering misconfigured — read the products straight from StoreKit.
  if (plans.length === 0) {
    const res = await Purchases.getProducts({
      productIdentifiers: [YEARLY_PRODUCT_ID, MONTHLY_PRODUCT_ID],
    });
    plans = ((res?.products ?? []) as AnyRecord[]).map((product) =>
      toPlan({ identifier: product?.identifier, packageType: '', product })
    );
  }

  plans.sort((a, b) => (a.period === 'year' ? -1 : b.period === 'year' ? 1 : 0));

  const { isSubscribed, renewsAt } = readEntitlement(customerRes?.customerInfo ?? customerRes);
  return { plans, isSubscribed, renewsAt, storeUnavailable: false };
}

export async function purchasePlan(packageIdentifier: string): Promise<boolean> {
  const Purchases = await ensureConfigured();
  const offeringsRes = await Purchases.getOfferings();
  const all = offeringsRes?.all ?? {};
  const current = offeringsRes?.current ?? all.default ?? Object.values(all)[0] ?? null;
  const pkg = ((current as AnyRecord)?.availablePackages ?? []).find(
    (p: AnyRecord) => p?.identifier === packageIdentifier
  );

  let result: AnyRecord;
  if (pkg) {
    result = await Purchases.purchasePackage({ aPackage: pkg });
  } else {
    const res = await Purchases.getProducts({ productIdentifiers: [packageIdentifier] });
    const product = (res?.products ?? [])[0];
    if (!product) throw new StoreUnavailableError('המוצר אינו זמין כרגע ב-App Store');
    result = await Purchases.purchaseStoreProduct({ product });
  }
  return readEntitlement(result?.customerInfo).isSubscribed;
}

export async function restorePurchases(): Promise<boolean> {
  const Purchases = await ensureConfigured();
  const result = await Purchases.restorePurchases();
  return readEntitlement(result?.customerInfo ?? result).isSubscribed;
}

/** Warm the StoreKit catalog at launch — the first request can take 15-20s cold. */
export function warmupSubscriptions() {
  void loadSubscriptionState().catch(() => {});
}
