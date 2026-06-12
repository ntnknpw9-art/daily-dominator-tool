import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX, Sun, Moon, Bell, BellOff, Skull, Trash2, Watch, CheckCircle2, RefreshCw, Sparkles, Heart, Crown, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { getTheme, applyTheme } from '@/lib/theme';
import { useHealthSync } from '@/hooks/useHealthSync';
import { usePremium } from '@/hooks/usePremium';
import { getOfferings, getStoreProducts, purchasePackage, purchaseStoreProduct, restorePurchases, isIOSNative, PRODUCT_MONTHLY, PRODUCT_YEARLY } from '@/lib/revenuecat';


const NO_MERCY_KEY = 'app_no_mercy_mode';

type RevenueCatPackage = {
  identifier?: string;
  packageType?: string;
  offeringIdentifier?: string;
  presentedOfferingContext?: unknown;
  product?: {
    identifier?: string;
    title?: string;
    priceString?: string;
    subscriptionPeriod?: string | { unit?: string };
  };
};

type RevenueCatOffering = {
  identifier?: string;
  monthly?: RevenueCatPackage;
  annual?: RevenueCatPackage;
  availablePackages?: RevenueCatPackage[];
};

type RevenueCatStoreProduct = RevenueCatPackage['product'] & {
  identifier: string;
  source?: string;
};

const SUBSCRIPTION_PRODUCTS_UNAVAILABLE = 'מוצרי המנוי לא זמינים כרגע מ-App Store. נסה לרענן או לבדוק שוב בעוד רגע.';
const SUBSCRIPTION_PRODUCTS_LOADING = 'טוען את מוצרי המנוי מ-App Store...';

const subscriptionDebug = (label: string, data?: unknown) => {
  try {
    console.log('[SUBSCRIPTION DEBUG][UI]', label, JSON.stringify({ at: new Date().toISOString(), data }, null, 2));
  } catch {
    console.log('[SUBSCRIPTION DEBUG][UI]', label, data);
  }
};

const subscriptionErrorDebug = (label: string, error: unknown) => {
  const e = error as { message?: string; code?: string | number; readableErrorCode?: string; readable_error_code?: string; underlyingErrorMessage?: string; userCancelled?: boolean; stack?: string; name?: string };
  let raw: string;
  try {
    raw = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
  } catch {
    raw = String(error);
  }
  console.error('[SUBSCRIPTION DEBUG][UI ERROR]', label, {
    message: e?.message ?? String(error),
    code: e?.code,
    readableErrorCode: e?.readableErrorCode,
    readable_error_code: e?.readable_error_code,
    underlyingErrorMessage: e?.underlyingErrorMessage,
    userCancelled: e?.userCancelled,
    name: e?.name,
    stack: e?.stack,
    raw,
  });
};

const SettingsTab = () => {
  const { signOut, user } = useAuth();
  const { syncHealthData, isSyncing } = useHealthSync();
  const { isPremium, productId, expiresAt, reload: reloadPremium } = usePremium();
  const [offerings, setOfferings] = useState<RevenueCatOffering | null>(null);
  const [storeProducts, setStoreProducts] = useState<RevenueCatStoreProduct[]>([]);
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const catalogLoadPromiseRef = useRef<Promise<{ offering: RevenueCatOffering | null; products: RevenueCatStoreProduct[] }> | null>(null);

  const loadSubscriptionProducts = useCallback(async (reason: 'auto' | 'purchase' | 'refresh' = 'auto') => {
    if (!isIOSNative()) return { offering: null, products: [] };
    if (catalogLoadPromiseRef.current) return catalogLoadPromiseRef.current;

    const promise = (async () => {
      setOfferingsLoaded(false);
      setOfferingsError(null);
      try {
        subscriptionDebug('loading subscription catalog', { reason, userId: user?.id, expectedProducts: [PRODUCT_MONTHLY, PRODUCT_YEARLY] });
        const offering = await getOfferings();
          const packages = offering?.availablePackages ?? [];
          subscriptionDebug('offerings loaded result', offering ? {
            identifier: offering?.identifier,
            packagesCount: packages.length,
            availablePackages: packages.map((p: RevenueCatPackage) => ({
              identifier: p?.identifier,
              packageType: p?.packageType,
              productIdentifier: p?.product?.identifier,
              priceString: p?.product?.priceString,
            })) ?? [],
            expectedProducts: [PRODUCT_MONTHLY, PRODUCT_YEARLY],
          } : null);
          subscriptionDebug('packages count', packages.length);
          setOfferings(offering);

          let products: RevenueCatStoreProduct[] = [];
          if (!offering || packages.length < 2) {
            subscriptionDebug('offerings missing packages; trying direct StoreKit product load', { reason, packagesCount: packages.length });
            products = await getStoreProducts();
            subscriptionDebug('direct products loaded result', products.map((p) => ({
              identifier: p.identifier,
              priceString: p.priceString,
              title: p.title,
            })));
            setStoreProducts(products);
            if (products.length === 0) setOfferingsError(SUBSCRIPTION_PRODUCTS_UNAVAILABLE);
          }

          return { offering, products };
      } catch (e) {
        const error = e as { message?: string };
        subscriptionErrorDebug('subscription catalog load failed', e);
        setOfferingsError(error?.message || SUBSCRIPTION_PRODUCTS_UNAVAILABLE);
        return { offering: null, products: [] };
      } finally {
        setOfferingsLoaded(true);
        catalogLoadPromiseRef.current = null;
      }
    })();

    catalogLoadPromiseRef.current = promise;
    return promise;
  }, [user?.id]);

  useEffect(() => {
    if (subOpen && isIOSNative() && !offeringsLoaded && !offerings && storeProducts.length === 0) {
      void loadSubscriptionProducts('auto');
    }
  }, [subOpen, offeringsLoaded, offerings, storeProducts.length, loadSubscriptionProducts]);

  // Hard timeout: if RevenueCat doesn't return within 9s after opening the
  // dialog, stop the spinner and surface a clear error — never leave the UI
  // stuck on "loading". Fallback prices are already shown via getPriceLabel.
  useEffect(() => {
    if (!subOpen || !isIOSNative() || offeringsLoaded) return;
    const t = setTimeout(() => {
      setOfferingsLoaded(true);
      setOfferingsError((prev) => prev || 'לא הצלחנו לטעון מחירים מ-App Store. המחירים המוצגים הם מחירי ברירת מחדל. נסה שוב או "שחזר רכישות".');
    }, 9000);
    return () => clearTimeout(t);
  }, [subOpen, offeringsLoaded]);

  const findPackage = (productKey: string, source: RevenueCatOffering | null = offerings) => {
    if (!source) return null;
    const isMonthly = productKey === PRODUCT_MONTHLY;
    const packages = source?.availablePackages ?? [];
    const standardIdentifier = isMonthly ? '$rc_monthly' : '$rc_annual';
    const standardType = isMonthly ? 'monthly' : 'annual';

    const standardMatch = packages.find((p) =>
      p?.identifier === standardIdentifier || p?.packageType?.toLowerCase() === standardType
    );
    if (standardMatch) return standardMatch;

    const productMatch = packages.find((p) => p?.product?.identifier === productKey);
    if (productMatch) return productMatch;

    // Fallback 2: period-based heuristic.
    const desiredPeriod = isMonthly ? 'month' : 'year';
    return packages.find((p) => {
      const packageText = `${p?.identifier ?? ''} ${p?.packageType ?? ''}`.toLowerCase();
      const subscriptionPeriod = typeof p?.product?.subscriptionPeriod === 'string'
        ? p.product.subscriptionPeriod.toLowerCase()
        : p?.product?.subscriptionPeriod?.unit?.toLowerCase() ?? '';
      return isMonthly
        ? packageText.includes('monthly') || subscriptionPeriod.includes(desiredPeriod)
        : packageText.includes('annual') || packageText.includes('year') || subscriptionPeriod.includes(desiredPeriod);
    }) ?? null;
  };

  const findStoreProduct = (productKey: string) =>
    storeProducts.find((p) => p?.identifier === productKey) ?? null;

  const FALLBACK_PRICES: Record<string, string> = {
    [PRODUCT_MONTHLY]: '₪39.90',
    [PRODUCT_YEARLY]: '₪179.90',
  };

  // Always return a concrete price — never show a spinner-only label.
  // If RevenueCat hasn't returned yet (or failed), display the fallback price
  // so users (and App Review) always see a clear amount.
  const getPriceLabel = (productKey: string) =>
    findPackage(productKey)?.product?.priceString
    || findStoreProduct(productKey)?.priceString
    || FALLBACK_PRICES[productKey]
    || 'רכוש';

  const getPurchaseErrorMessage = (error: { message?: string; code?: string | number; readableErrorCode?: string; readable_error_code?: string; underlyingErrorMessage?: string }) => {
    const msg = error?.message || '';
    const code = error?.code ?? error?.readableErrorCode ?? error?.readable_error_code;
    const underlying = error?.underlyingErrorMessage;
    if (msg.includes('timed out')) {
      return 'הרכישה לא קיבלה תשובה מ-App Store בזמן סביר. נסה שוב, ואם זה ממשיך — המוצר כנראה לא זמין ב-Sandbox/App Store כרגע.';
    }
    const details = [msg, code && `code: ${code}`, underlying && `(${underlying})`].filter(Boolean).join(' · ');
    return details || 'המוצר לא זמין כרגע. נסה שוב מאוחר יותר.';
  };

  const handlePurchase = async (productKey: string) => {
    if (!isIOSNative()) {
      toast.info('הרכישות זמינות באפליקציה על iPhone בלבד');
      return;
    }
    setPurchasing(productKey);
    setOfferingsError(null);
    try {
      let selectedPackage = findPackage(productKey);
      let selectedProduct = findStoreProduct(productKey);

      if (!selectedPackage && !selectedProduct) {
        subscriptionDebug('no preloaded product — loading RevenueCat catalog before purchase', { productKey });
        const fresh = await loadSubscriptionProducts('purchase');
        selectedPackage = findPackage(productKey, fresh.offering);
        selectedProduct = fresh.products.find((p) => p?.identifier === productKey) ?? findStoreProduct(productKey);
        if (!selectedPackage && !selectedProduct) throw new Error(SUBSCRIPTION_PRODUCTS_UNAVAILABLE);
        const res = selectedPackage
          ? await purchasePackage(selectedPackage)
          : await purchaseStoreProduct(selectedProduct);
        subscriptionDebug('purchase success', res);
        if (res.isPremium) {
          toast.success('תודה רבה על התמיכה! 💜');
          reloadPremium();
        } else {
          toast.info('הרכישה הסתיימה אבל לא נמצא מנוי פעיל. נסה לשחזר רכישות בעוד רגע.');
        }
        return;
      }

      let res;
      if (selectedPackage) {
        subscriptionDebug('purchase package from offering', {
          requestedProductKey: productKey,
          packageIdentifier: selectedPackage?.identifier,
          offeringIdentifier: selectedPackage?.offeringIdentifier,
          productIdentifier: selectedPackage?.product?.identifier,
        });
        res = await purchasePackage(selectedPackage);
      } else {
        subscriptionDebug('purchase direct StoreKit product fallback', {
          requestedProductKey: productKey,
          productIdentifier: selectedProduct?.identifier,
          priceString: selectedProduct?.priceString,
        });
        res = await purchaseStoreProduct(selectedProduct);
      }
      subscriptionDebug('purchase success', res);
      if (res.isPremium) {
        toast.success('תודה רבה על התמיכה! 💜');
        reloadPremium();
      } else {
        toast.info('הרכישה הסתיימה אבל לא נמצא מנוי פעיל. נסה לשחזר רכישות בעוד רגע.');
      }
    } catch (e) {
      const error = e as { message?: string; code?: string | number; readableErrorCode?: string; readable_error_code?: string; underlyingErrorMessage?: string; userCancelled?: boolean };
      subscriptionErrorDebug('full purchase error', e);
      const msg = error?.message || '';
      if (!msg.toLowerCase().includes('cancel') && !error?.userCancelled) {
        const message = getPurchaseErrorMessage(error);
        setOfferingsError(message);
        toast.error('הרכישה נכשלה: ' + message);
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    if (!isIOSNative()) {
      toast.info('שחזור רכישות זמין באפליקציה על iPhone בלבד');
      return;
    }
    try {
      setRestoring(true);
      subscriptionDebug('restore purchases start', { userId: user?.id });
      const res = await restorePurchases();
      subscriptionDebug('restore purchases result', res);
      if (res.isPremium) {
        toast.success('הרכישה שוחזרה בהצלחה');
      } else {
        toast.info('לא נמצאו רכישות פעילות');
      }
      reloadPremium();
    } catch (e) {
      const error = e as { message?: string };
      subscriptionErrorDebug('restore purchases failed', e);
      toast.error('שחזור נכשל: ' + (error?.message || ''));
    } finally {
      setRestoring(false);
    }
  };

  const [deleting, setDeleting] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [theme, setTheme] = useState<'dark' | 'light'>(getTheme);
  const [notificationsOn, setNotificationsOn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('app_notifications_enabled') === 'true';
  });
  const [noMercy, setNoMercy] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(NO_MERCY_KEY) === 'true';
  });

  const [wearableToConnect, setWearableToConnect] = useState<string | null>(null);

  const [connectedWearables, setConnectedWearables] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('app_connected_wearables') || '[]');
    } catch { return []; }
  });

  const toggleWearable = (wearable: string) => {
    setConnectedWearables(prev => {
      const next = prev.includes(wearable) ? prev.filter(w => w !== wearable) : [...prev, wearable];
      localStorage.setItem('app_connected_wearables', JSON.stringify(next));
      if (!prev.includes(wearable)) {
        toast.success(`חובר בהצלחה: ${wearable}`);
      } else {
        toast.info(`נותק: ${wearable}`);
      }
      return next;
    });
  };

  const getWearableInstructions = (wearable: string) => {
    if (wearable.includes('Garmin')) {
      return (
        <div className="space-y-2 text-sm text-right mt-2">
          <p>האפליקציה שלנו שואבת נתונים מ-Apple Health. כדי שנתוני ה-Garmin יגיעו אלינו, צריך לחבר אותו ל-Apple Health:</p>
          <ol className="list-decimal list-inside space-y-1 pr-4">
            <li>פתח את אפליקציית <strong>Garmin Connect</strong> בטלפון שלך.</li>
            <li>עבור להגדרות (Settings) {'>'} אפליקציות מחוברות (Connected Apps).</li>
            <li>בחר ב-<strong>Apple Health</strong> ואשר את כל ההרשאות.</li>
            <li>אחרי שאישרת, הנתונים יסתנכרו אוטומטית כשתלחץ על ״סנכרן נתונים״ אצלנו.</li>
          </ol>
        </div>
      );
    }
    if (wearable.includes('Fitbit')) {
      return (
        <div className="space-y-2 text-sm text-right mt-2">
          <p>האפליקציה שלנו שואבת נתונים מ-Apple Health. כדי שנתוני ה-Fitbit יגיעו אלינו, צריך לחבר אותו ל-Apple Health:</p>
          <ol className="list-decimal list-inside space-y-1 pr-4">
            <li>פתח את אפליקציית <strong>Fitbit</strong> בטלפון שלך.</li>
            <li>עבור להגדרות החשבון {'>'} שילובים/אפליקציות צד שלישי.</li>
            <li>בחר ב-<strong>Apple Health</strong> ואפשר גישה.</li>
            <li>אחרי שאישרת, הנתונים יסתנכרו אוטומטית כשתלחץ על ״סנכרן נתונים״ אצלנו.</li>
          </ol>
        </div>
      );
    }
    return (
      <div className="space-y-2 text-sm text-right mt-2">
        <p>כדי לחבר את המכשיר ל-Apple Health:</p>
        <ol className="list-decimal list-inside space-y-1 pr-4">
          <li>לחץ על "הבנתי".</li>
          <li>המערכת שלנו תקפיץ חלון שמבקש הרשאה מ-Apple Health לצעדים, שינה, קלוריות וזמן אימון.</li>
          <li><strong>סמן את כל ההרשאות באישורים (Turn On All).</strong></li>
          <li>זהו! כעת אפשר ללחוץ תמיד על ״סנכרן נתונים״ והכל יתעדכן.</li>
        </ol>
      </div>
    );
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      try { localStorage.clear(); } catch (e) { console.warn('localStorage clear failed', e); }
      toast.success('החשבון נמחק');
      await signOut();
    } catch (e) {
      const error = e as { message?: string };
      toast.error('שגיאה במחיקת החשבון: ' + (error?.message || ''));
      setDeleting(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">⚙️ הגדרות</CardTitle>
            {isPremium && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/40">
                <Crown className="w-3.5 h-3.5 text-accent" fill="currentColor" />
                <span className="text-xs font-semibold text-accent">תומך</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">מצב תצוגה</div>
              <div className="text-xs text-muted-foreground">מעבר בין מצב כהה לבהיר</div>
            </div>
            <Button
              variant={theme === 'dark' ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'dark' ? 'כהה' : 'בהיר'}
            </Button>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">אפקטי סאונד</div>
              <div className="text-xs text-muted-foreground">צלילים בעת סימון משימות, טיימר והישגים</div>
            </div>
            <Button
              variant={soundOn ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => {
                const newVal = !soundOn;
                setSoundEnabled(newVal);
                setSoundOn(newVal);
              }}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundOn ? 'מופעל' : 'מושבת'}
            </Button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">התראות חכמות</div>
              <div className="text-xs text-muted-foreground">תזכורות לפני משימות, התראות פספוס ועידוד. דורש אישורך.</div>
            </div>
            <Button
              variant={notificationsOn ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={async () => {
                if (!notificationsOn) {
                  // Request explicit consent before enabling
                  try {
                    const { Capacitor } = await import('@capacitor/core');
                    if (Capacitor.isNativePlatform()) {
                      const { LocalNotifications } = await import('@capacitor/local-notifications');
                      const status = await LocalNotifications.checkPermissions();
                      let display = status.display;
                      if (display !== 'granted') {
                        const req = await LocalNotifications.requestPermissions();
                        display = req.display;
                      }
                      if (display !== 'granted') {
                        toast.error('לא ניתן אישור להתראות. ניתן להפעיל מההגדרות של המכשיר.');
                        return;
                      }
                    } else if (typeof Notification !== 'undefined' && Notification.requestPermission) {
                      const perm = await Notification.requestPermission();
                      if (perm !== 'granted') {
                        toast.error('לא ניתן אישור להתראות. ניתן להפעיל מההגדרות של המכשיר.');
                        return;
                      }
                    }
                  } catch (e) {
                    toast.error('שגיאה בבקשת אישור להתראות.');
                    return;
                  }
                  setNotificationsOn(true);
                  localStorage.setItem('app_notifications_enabled', 'true');
                  toast.success('התראות הופעלו');
                } else {
                  setNotificationsOn(false);
                  localStorage.setItem('app_notifications_enabled', 'false');
                }
              }}
            >
              {notificationsOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {notificationsOn ? 'מופעל' : 'מושבת'}
            </Button>
          </div>

          {/* No Mercy Mode */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-1">
                <Skull className="w-4 h-4 text-destructive" />
                מצב אין רחמים
              </div>
              <div className="text-xs text-muted-foreground">הודעות קשות וישירות. בלי פילטרים.</div>
            </div>
            <Button
              variant={noMercy ? "destructive" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => {
                const newVal = !noMercy;
                setNoMercy(newVal);
                localStorage.setItem(NO_MERCY_KEY, String(newVal));
              }}
            >
              <Skull className="w-4 h-4" />
              {noMercy ? 'מופעל' : 'מושבת'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Watch className="w-5 h-5 text-blue-400" />
              שעונים ובריאות
            </CardTitle>
            <Button variant="outline" size="sm" onClick={syncHealthData} disabled={isSyncing} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              סנכרן נתונים
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground mb-4">
            חבר את השעון החכם שלך (Apple Health, Garmin, Fitbit) לקבלת נתוני צעדים ושינה.
            <br/><span className="text-primary font-bold">הערה:</span> משתמשי Garmin/Fitbit ב-iOS צריכים להגדיר סנכרון דרך Apple Health.
          </div>
          
          {['Apple Health (iOS)', 'Garmin Connect (דרך Apple Health)', 'Fitbit (דרך Apple Health)'].map(wearable => (
            <div key={wearable} className="flex items-center justify-between bg-background/50 border border-border/50 rounded-lg p-3">
              <div className="text-sm font-medium">{wearable}</div>
              <Button
                variant={connectedWearables.includes(wearable) ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (connectedWearables.includes(wearable)) {
                    toggleWearable(wearable);
                  } else {
                    setWearableToConnect(wearable);
                  }
                }}
              >
                {connectedWearables.includes(wearable) ? (
                  <><CheckCircle2 className="w-4 h-4" /> מחובר</>
                ) : 'התחבר'}
              </Button>
            </div>
          ))}
          
          <AlertDialog open={!!wearableToConnect} onOpenChange={(open) => !open && setWearableToConnect(null)}>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>חיבור {wearableToConnect}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  {wearableToConnect && getWearableInstructions(wearableToConnect)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2 justify-end sm:justify-start">
                <AlertDialogCancel className="mt-0">ביטול</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  if (wearableToConnect) {
                    toggleWearable(wearableToConnect);
                    if (wearableToConnect.includes('Apple')) {
                      syncHealthData(); // Trigger the actual prompt
                    }
                  }
                }}>
                  הבנתי, סמן כמחובר
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            תוכנית אימון אישית
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">עדכן את התוכנית שלך</div>
              <div className="text-xs text-muted-foreground">ענה שוב על השאלון כדי לבנות תוכנית חדשה לפי המטרות העדכניות שלך.</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                  עדכן תוכנית
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>למלא את השאלון מחדש?</AlertDialogTitle>
                  <AlertDialogDescription>
                    תועבר לשאלון ההתאמה האישית כדי לבנות תוכנית אימון חדשה. התוכנית הקיימת תוחלף בתוכנית החדשה.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 justify-end sm:justify-start">
                  <AlertDialogCancel className="mt-0">ביטול</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (user) localStorage.removeItem(`onboarding_done_${user.id}`);
                      window.location.reload();
                    }}
                  >
                    כן, בוא נתחיל
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            מנוי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            כל הפיצ׳רים של האפליקציה פתוחים לכולם בחינם — ללא הבדל בין משתמשים. המנוי הוא דרך לתמוך בפיתוח האפליקציה.
          </div>
          <Button
            variant="default"
            className="w-full gap-2"
            onClick={() => setSubOpen(true)}
          >
            <Crown className="w-4 h-4" />
            {isPremium ? 'נהל מנוי' : 'הצטרף כתומך'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0" dir="rtl">
          <div className="flex flex-col px-6 pb-6 pt-6">
            <DialogHeader className="text-center items-center space-y-3">
              <div className="grid place-items-center size-20 rounded-[22px] bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/40 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.5)]">
                <Crown className="w-10 h-10 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-center w-full">
                מנוי תמיכה
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-center w-full">
                כל פיצ׳רי האפליקציה זמינים לכולם בחינם. המנוי הוא דרך אופציונלית לתמוך בפיתוח.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 flex items-center justify-between bg-background/40 border border-border/40 rounded-lg p-3">
              <div className="text-sm">
                <div className="font-medium">סטטוס</div>
                <div className="text-xs text-muted-foreground">
                  {isPremium ? 'תומך פעיל — תודה!' : 'לא רשום'}
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${isPremium ? 'bg-accent/10 text-accent border-accent/30' : 'bg-muted text-muted-foreground border-border'}`}>
                {isPremium ? 'תומך' : 'חינמי'}
              </span>
            </div>

            {(() => {
              const monthlyPkg = findPackage(PRODUCT_MONTHLY);
              const yearlyPkg = findPackage(PRODUCT_YEARLY);
              const monthlyProduct = findStoreProduct(PRODUCT_MONTHLY);
              const yearlyProduct = findStoreProduct(PRODUCT_YEARLY);
              const blockMonthly = isIOSNative() && offeringsLoaded && !monthlyPkg && !monthlyProduct;
              const blockYearly = isIOSNative() && offeringsLoaded && !yearlyPkg && !yearlyProduct;
              const activeProductKey = selectedPlan === 'monthly' ? PRODUCT_MONTHLY : PRODUCT_YEARLY;
              const activeBlocked = selectedPlan === 'monthly' ? blockMonthly : blockYearly;
              return (
                <>
                  <div className="mt-5 space-y-2.5">
                    <PlanRow
                      selected={selectedPlan === 'yearly'}
                      onSelect={() => setSelectedPlan('yearly')}
                      title="שנתי"
                      badge="חיסכון 62%"
                      price={getPriceLabel(PRODUCT_YEARLY)}
                      period="לשנה"
                    />
                    <PlanRow
                      selected={selectedPlan === 'monthly'}
                      onSelect={() => setSelectedPlan('monthly')}
                      title="חודשי"
                      price={getPriceLabel(PRODUCT_MONTHLY)}
                      period="לחודש"
                    />
                  </div>

                  <button
                    onClick={() => handlePurchase(activeProductKey)}
                    disabled={!!purchasing || isPremium || activeBlocked}
                    className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-semibold text-accent-foreground shadow-[0_0_30px_-5px_hsl(var(--accent)/0.6)] transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {purchasing ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="size-5" />
                        <span>המשך</span>
                      </>
                    )}
                  </button>
                </>
              );
            })()}

            {isIOSNative() && !offeringsLoaded && !findPackage(PRODUCT_MONTHLY) && !findPackage(PRODUCT_YEARLY) && (
              <div className="mt-3 text-[11px] text-muted-foreground text-center">
                טוען מחירים מ-App Store... אפשר ללחוץ, הרכישה תנסה לטעון מחדש.
              </div>
            )}

            {isIOSNative() && offeringsLoaded && !findPackage(PRODUCT_MONTHLY) && !findPackage(PRODUCT_YEARLY) && !findStoreProduct(PRODUCT_MONTHLY) && !findStoreProduct(PRODUCT_YEARLY) && (
              <div className="mt-3 text-[11px] text-destructive text-center">
                {offeringsError || SUBSCRIPTION_PRODUCTS_UNAVAILABLE}
              </div>
            )}

            <button
              onClick={handleRestore}
              disabled={restoring}
              className="mt-3 text-center text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-60"
            >
              {restoring ? 'משחזר...' : 'שחזר רכישות'}
            </button>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              <span>תשלום מאובטח דרך App Store</span>
            </div>

            <p className="mt-4 text-[11px] leading-5 text-muted-foreground/80 text-center">
              התשלום יחויב דרך חשבון ה-Apple ID שלך בעת אישור הרכישה. המנוי מתחדש אוטומטית בסוף כל תקופה (חודשי/שנתי) באותו מחיר, אלא אם בוטל לפחות 24 שעות לפני תום התקופה. ניתן לנהל ולבטל את המנוי בכל עת דרך הגדרות חשבון ה-Apple ID.
            </p>

            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-3 border-t border-border/30">
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline-offset-2 hover:underline">
                תנאי שימוש (EULA)
              </a>
              <span>·</span>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline-offset-2 hover:underline">
                מדיניות פרטיות
              </a>
            </div>

            {!isIOSNative() && (
              <div className="mt-3 text-[11px] text-muted-foreground text-center">
                רכישות זמינות באפליקציה על iPhone בלבד
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>





      <Card className="border-destructive/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-destructive">⚠️ אזור מסוכן</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">מחיקת חשבון</div>
              <div className="text-xs text-muted-foreground">מחיקה מלאה של החשבון וכל הנתונים. לא ניתן לשחזר.</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2" disabled={deleting}>
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'מוחק...' : 'מחק חשבון'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>בטוח שברצונך למחוק את החשבון?</AlertDialogTitle>
                  <AlertDialogDescription>
                    פעולה זו תמחק לצמיתות את החשבון, ההישגים, המשימות וכל הנתונים מהשרת. לא ניתן לבטל.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    כן, מחק את החשבון
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;

function PlanRow({
  selected,
  onSelect,
  title,
  badge,
  price,
  period,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  badge?: string;
  price: string;
  period: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'relative flex w-full items-center justify-between rounded-2xl border p-4 text-right transition',
        selected
          ? 'border-accent bg-card shadow-[0_0_20px_-8px_hsl(var(--accent)/0.7)]'
          : 'border-border bg-card/60 hover:bg-card',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            'grid size-6 place-items-center rounded-full border-2 transition',
            selected ? 'border-accent bg-accent' : 'border-muted-foreground/40',
          ].join(' ')}
        >
          {selected && <Check className="size-3.5 text-accent-foreground" strokeWidth={3} />}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{title}</span>
            {badge && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent border border-accent/30">
                {badge}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{period}</div>
        </div>
      </div>
      <div className="text-left">
        <div className="text-lg font-bold tracking-tight">{price}</div>
      </div>
    </button>
  );
}
