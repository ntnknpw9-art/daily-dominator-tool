// =============================================================
// Subscription layer (RevenueCat) — identical logic to the
// standalone paywall app that works on device.
// =============================================================

export const MONTHLY_PRODUCT_ID = 'premium_monthly';
export const YEARLY_PRODUCT_ID = 'premium_yearly';
export const ENTITLEMENT_ID = 'premium';
// RevenueCat entitlement identifiers can differ between dashboard setups
// ('pro' / 'PRO' / 'premium'). Any ACTIVE entitlement means the purchase went
// through — otherwise a successful payment is reported as "not completed".
const isEntitled = (customerInfo: AnyRecord | undefined | null) => {
  const active = (customerInfo?.entitlements?.active ?? {}) as AnyRecord;
  const keys = Object.keys(active);
  console.log('[SUBSCRIPTION] active entitlements', keys);
  return keys.length > 0;
};

const activeEntitlement = (customerInfo: AnyRecord | undefined | null) => {
  const active = (customerInfo?.entitlements?.active ?? {}) as AnyRecord;
  return (
    active[ENTITLEMENT_ID] ??
    active['pro'] ??
    active['PRO'] ??
    active[Object.keys(active)[0] ?? ''] ??
    null
  );
};
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

// `appl_` keys are publishable — safe to ship in the bundle.
const DEFAULT_IOS_API_KEY = 'appl_FjjpXFIxixSDQVCgXkqwTSSKmVR';
const API_KEY =
  ((import.meta.env['VITE_REVENUECAT_IOS_API_KEY'] as string | undefined) || '').trim() ||
  DEFAULT_IOS_API_KEY;

export class StoreUnavailableError extends Error {
  constructor(message = 'החנות אינה זמינה בסביבה זו') {
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
    priceString: '‏179.90 ₪',
    price: 179.9,
    currencyCode: 'ILS',
    period: 'year',
    storeUnavailable: true,
  },
  {
    packageIdentifier: '$rc_monthly',
    productIdentifier: MONTHLY_PRODUCT_ID,
    priceString: '‏39.90 ₪',
    price: 39.9,
    currencyCode: 'ILS',
    period: 'month',
    storeUnavailable: true,
  },
];

type AnyRecord = Record<string, any>;

let configurePromise: Promise<boolean> | null = null;

async function loadPlugin(): Promise<AnyRecord | null> {
  if (typeof window === 'undefined') return null;
  try {
    const [{ Capacitor }, rc] = await Promise.all([
      import('@capacitor/core'),
      import('@revenuecat/purchases-capacitor'),
    ]);
    if (!Capacitor.isNativePlatform()) return null;
    return rc as unknown as AnyRecord;
  } catch {
    return null;
  }
}

async function ensureConfigured(): Promise<boolean> {
  if (!configurePromise) {
    configurePromise = (async () => {
      const rc = await loadPlugin();
      if (!rc || !API_KEY) return false;
      await rc.Purchases.configure({ apiKey: API_KEY });
      // Attach the purchase to the signed-in account so it is not lost.
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) await rc.Purchases.logIn({ appUserID: data.user.id });
      } catch (e) {
        console.warn('[SUBSCRIPTION] logIn skipped', e);
      }
      return true;
    })();
  }
  return configurePromise;
}

export async function isStoreAvailable() {
  return (await loadPlugin()) !== null;
}

const planFromPackage = (pkg: AnyRecord): PlanOption | null => {
  const productIdentifier: string = pkg?.product?.identifier ?? '';
  const period: PlanOption['period'] = productIdentifier.startsWith(YEARLY_PRODUCT_ID)
    ? 'year'
    : productIdentifier.startsWith(MONTHLY_PRODUCT_ID)
      ? 'month'
      : 'other';
  if (period === 'other') return null;
  return {
    packageIdentifier: pkg?.identifier ?? '',
    productIdentifier,
    priceString: pkg?.product?.priceString ?? '',
    price: Number(pkg?.product?.price ?? 0),
    currencyCode: pkg?.product?.currencyCode ?? 'ILS',
    period,
  };
};

export async function loadSubscriptionState(): Promise<SubscriptionState> {
  const rc = await loadPlugin();
  const configured = await ensureConfigured();
  if (!rc || !configured) {
    return { plans: PREVIEW_PLANS, isSubscribed: false, renewsAt: null, storeUnavailable: true };
  }

  const [offerings, customer] = await Promise.all([
    rc.Purchases.getOfferings(),
    rc.Purchases.getCustomerInfo(),
  ]);

  const plans = ((offerings?.current?.availablePackages ?? []) as AnyRecord[])
    .map(planFromPackage)
    .filter((p): p is PlanOption => p !== null)
    .sort((a, b) => (a.period === 'year' ? -1 : b.period === 'year' ? 1 : 0));

  const entitlement = activeEntitlement(customer?.customerInfo);

  return {
    plans,
    isSubscribed: isEntitled(customer?.customerInfo),
    renewsAt: (entitlement as AnyRecord)?.expirationDate ?? null,
    storeUnavailable: false,
  };
}

export async function purchasePlan(packageIdentifier: string): Promise<boolean> {
  const rc = await loadPlugin();
  const configured = await ensureConfigured();
  if (rc && !API_KEY) throw new MissingApiKeyError();
  if (!rc || !configured) throw new StoreUnavailableError();

  const { current } = await rc.Purchases.getOfferings();
  const aPackage = (current?.availablePackages ?? []).find(
    (p: AnyRecord) => p?.identifier === packageIdentifier
  );
  if (!aPackage) throw new Error('המנוי המבוקש אינו זמין כרגע');

  const { customerInfo } = await rc.Purchases.purchasePackage({ aPackage });
  return isEntitled(customerInfo);
}

export async function restorePurchases(): Promise<boolean> {
  const rc = await loadPlugin();
  const configured = await ensureConfigured();
  if (rc && !API_KEY) throw new MissingApiKeyError();
  if (!rc || !configured) throw new StoreUnavailableError();

  const { customerInfo } = await rc.Purchases.restorePurchases();
  return isEntitled(customerInfo);
}

/** Warm the StoreKit catalog at launch — the first request can take 15-20s cold. */
export function warmupSubscriptions() {
  void loadSubscriptionState().catch(() => {});
}

/**
 * Apple does not allow cancelling a subscription inside the app itself.
 * The closest supported experience is opening Apple's own subscription
 * management screen — on device we use the RevenueCat `managementURL`
 * (or the `itms-apps://` deep link) so it opens as a native sheet over
 * the app instead of a browser tab.
 */
export async function openManageSubscriptions(): Promise<void> {
  const rc = await loadPlugin();
  let url = MANAGE_SUBSCRIPTIONS_URL;

  if (rc) {
    try {
      await ensureConfigured();
      const { customerInfo } = await rc.Purchases.getCustomerInfo();
      const managementURL = (customerInfo as AnyRecord)?.managementURL as string | undefined;
      if (managementURL) url = managementURL;
    } catch (e) {
      console.warn('[SUBSCRIPTION] managementURL unavailable', e);
    }

    try {
      const { AppLauncher } = await import('@capacitor/app-launcher');
      const deepLink = url.replace(/^https:\/\//, 'itms-apps://');
      const { completed } = await AppLauncher.openUrl({ url: deepLink });
      if (completed) return;
    } catch (e) {
      console.warn('[SUBSCRIPTION] AppLauncher failed', e);
    }

    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
      return;
    } catch (e) {
      console.warn('[SUBSCRIPTION] Browser failed', e);
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
