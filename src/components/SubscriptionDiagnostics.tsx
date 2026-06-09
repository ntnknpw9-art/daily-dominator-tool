import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle2, XCircle, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  getOfferings,
  getStoreProducts,
  refreshPremiumStatus,
  isIOSNative,
  getLastRevenueCatError,
  getRevenueCatClientConfig,
  getRevenueCatRemoteOfferingSnapshot,
  getRevenueCatRuntimeDiagnostics,
  getRevenueCatInitTrace,
  clearRevenueCatInitTrace,
  subscribeRevenueCatInitTrace,
  type RcTraceEntry,
  PRODUCT_MONTHLY,
  PRODUCT_YEARLY,
  ALL_PRODUCT_IDS,
} from '@/lib/revenuecat';

type StepStatus = 'idle' | 'running' | 'ok' | 'fail' | 'warn';

type Step = {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
  durationMs?: number;
};

const INITIAL_STEPS: Step[] = [
  { key: 'env', label: 'בדיקת סביבה (iOS Native)', status: 'idle' },
  { key: 'clientConfig', label: 'בדיקת קונפיגורציית RevenueCat באפליקציה', status: 'idle' },
  { key: 'plugin', label: 'טעינת פלאגין RevenueCat', status: 'idle' },
  { key: 'remoteOffering', label: 'בדיקת RevenueCat REST: Default Offering', status: 'idle' },
  { key: 'runtime', label: 'בדיקת Runtime: configured / appUserID / storefront', status: 'idle' },
  { key: 'offerings', label: 'קריאת Offerings מ-RevenueCat', status: 'idle' },
  { key: 'packages', label: 'בדיקת Packages זמינים', status: 'idle' },
  { key: 'directProducts', label: 'בדיקת Products ישירה מ-StoreKit', status: 'idle' },
  { key: 'products', label: 'התאמת Product IDs מ-App Store Connect', status: 'idle' },
  { key: 'customer', label: 'שליפת CustomerInfo (סטטוס premium)', status: 'idle' },
];

const StatusIcon = ({ status }: { status: StepStatus }) => {
  if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (status === 'ok') return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-destructive" />;
  if (status === 'warn') return <XCircle className="w-4 h-4 text-accent" />;
  return <div className="w-4 h-4 rounded-full border border-border" />;
};

export const SubscriptionDiagnostics = ({ autoRun = false }: { autoRun?: boolean } = {}) => {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [premiumCheckedAt, setPremiumCheckedAt] = useState<string | null>(null);
  const [trace, setTrace] = useState<RcTraceEntry[]>(() => getRevenueCatInitTrace());
  const autoRunRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeRevenueCatInitTrace(() => {
      setTrace(getRevenueCatInitTrace());
    });
    return unsub;
  }, []);

  const update = (key: string, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const run = async () => {
    setRunning(true);
    setSummary(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    clearRevenueCatInitTrace();
    const errors: string[] = [];

    // 1. ENV
    update('env', { status: 'running' });
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    const ios = isIOSNative();
    if (!ios) {
      update('env', {
        status: 'warn',
        detail: `platform=${platform}, isNative=${isNative}. הרכישות זמינות רק באפליקציה האמיתית על iPhone (לא בדפדפן).`,
      });
      errors.push('לא רץ ב-iOS Native — אי אפשר לבדוק רכישות בדפדפן.');
      setSummary('בדיקה דורשת הרצה באפליקציית iPhone האמיתית. בדפדפן/Lovable Preview רכישות לא יעבדו.');
      setLastRunAt(new Date().toLocaleString('he-IL'));
      setRunning(false);
      return;
    }
    update('env', { status: 'ok', detail: `platform=${platform}, isNative=${isNative}` });

    // 2. Client config
    update('clientConfig', { status: 'running' });
    const clientConfig = getRevenueCatClientConfig();
    const configProblems: string[] = [];
    if (!clientConfig.apiKeyLooksLikeIOS) configProblems.push('RevenueCat API key לא נראה כמו iOS key (צריך להתחיל ב-appl_)');
    const expectedProductLines = ALL_PRODUCT_IDS.map((id) => `• ${id}`).join('\n');
    update('clientConfig', {
      status: configProblems.length ? 'fail' : 'ok',
      detail: [
        `Bundle ID מצופה: ${clientConfig.expectedBundleId}`,
        `Build marker: ${clientConfig.buildMarker}`,
        `RevenueCat key prefix: ${clientConfig.apiKeyPrefix}… (${clientConfig.apiKeyLength} תווים)`,
        `StoreKit version: ${clientConfig.storeKitVersion}`,
        `Default Offering: ${clientConfig.expectedDefaultOfferingId}`,
        `Expected packages: ${clientConfig.expectedPackages.join(', ')}`,
        `Expected product IDs:\n${expectedProductLines}`,
        configProblems.length ? `בעיות:\n${configProblems.map((p) => `• ${p}`).join('\n')}` : 'קונפיגורציית האפליקציה נראית תקינה.',
      ].join('\n'),
    });
    if (configProblems.length) errors.push(...configProblems);

    // 3. Plugin
    update('plugin', { status: 'running' });
    let pluginOk = false;
    try {
      const start = Date.now();
      const mod = await import('@revenuecat/purchases-capacitor');
      pluginOk = !!mod?.Purchases;
      update('plugin', {
        status: pluginOk ? 'ok' : 'fail',
        detail: pluginOk ? 'הפלאגין נטען בהצלחה' : 'הפלאגין לא חשף את Purchases',
        durationMs: Date.now() - start,
      });
      if (!pluginOk) errors.push('Plugin לא טעון. הרץ npx cap sync ios.');
    } catch (e) {
      const err = e as Error;
      update('plugin', { status: 'fail', detail: `שגיאה: ${err?.message ?? String(e)}` });
      errors.push('Plugin import נכשל: ' + (err?.message ?? ''));
    }

    // 4. RevenueCat REST offering snapshot — runs before native runtime so an SDK hang cannot hide backend status.
    update('remoteOffering', { status: 'running' });
    try {
      const snapshot = await getRevenueCatRemoteOfferingSnapshot();
      const packageLines = snapshot.defaultPackages?.map((p: { identifier?: string; platform_product_identifier?: string }) => `• ${p.identifier} → ${p.platform_product_identifier}`).join('\n') || '(אין packages)';
      const defaultHasTwoPackages = snapshot.ok && snapshot.currentOfferingId === 'default' && snapshot.defaultPackages?.length === 2;
      update('remoteOffering', {
        status: defaultHasTwoPackages ? 'ok' : 'fail',
        detail: [
          `HTTP ok=${snapshot.ok} status=${snapshot.status ?? '—'} (${snapshot.elapsedMs}ms)`,
          `current_offering_id=${snapshot.currentOfferingId ?? '—'}`,
          `offerings=${snapshot.offeringIds?.join(', ') || '(אין)'}`,
          `default packages:\n${packageLines}`,
          defaultHasTwoPackages
            ? 'RevenueCat עצמו מוגדר נכון ומחזיר 2 packages. אם StoreKit עדיין מחזיר 0 — הבעיה בצד Apple/App Store Connect.'
            : 'RevenueCat REST לא מחזיר default עם 2 packages — צריך לתקן Offering/Products ב-RevenueCat לפני שליחה.',
        ].join('\n'),
        durationMs: snapshot.elapsedMs,
      });
      if (!defaultHasTwoPackages) errors.push('RevenueCat REST לא מחזיר Default Offering עם 2 packages.');
    } catch (e) {
      const err = e as Error;
      update('remoteOffering', { status: 'fail', detail: `שגיאה: ${err?.message ?? String(e)}` });
      errors.push('RevenueCat REST offering snapshot נכשל: ' + (err?.message ?? ''));
    }

    // 5. Runtime diagnostics
    update('runtime', { status: 'running' });
    try {
      const start = Date.now();
      const runtime = await getRevenueCatRuntimeDiagnostics();
      update('runtime', {
        status: runtime ? 'ok' : 'fail',
        detail: runtime ? JSON.stringify(runtime, null, 2) : 'RevenueCat לא מאותחל ב-iOS Native.',
        durationMs: Date.now() - start,
      });
      if (!runtime) errors.push('RevenueCat Runtime diagnostics נכשל.');
    } catch (e) {
      const err = e as Error;
      const lastError = getLastRevenueCatError();
      update('runtime', {
        status: 'fail',
        detail: [
          `שגיאה: ${err?.message ?? String(e)}`,
          lastError ? `Last SDK error:\n${JSON.stringify(lastError, null, 2)}` : null,
          'הבדיקה ממשיכה למרות תקיעת Runtime כדי לאבחן Offerings ו-StoreKit.',
        ].filter(Boolean).join('\n'),
      });
      errors.push('RevenueCat runtime diagnostics נכשל: ' + (err?.message ?? ''));
    }

    // 6. Offerings from SDK/StoreKit
    update('offerings', { status: 'running' });
    let offering: Awaited<ReturnType<typeof getOfferings>> = null;
    let offeringsDuration = 0;
    try {
      const start = Date.now();
      offering = await getOfferings();
      offeringsDuration = Date.now() - start;
      if (!offering) {
        const lastError = getLastRevenueCatError();
        update('offerings', {
          status: 'fail',
          detail: [
            'getOfferings החזיר null.',
            lastError ? `Last SDK error:\n${JSON.stringify(lastError, null, 2)}` : 'לא התקבלה שגיאת SDK מפורטת.',
            'אם בדיקת RevenueCat REST למעלה תקינה אבל כאן נכשל — RevenueCat מוגדר, אבל StoreKit/TestFlight לא מצליחים לקבל את מוצרי Apple.',
          ].join('\n'),
          durationMs: offeringsDuration,
        });
        errors.push('Offerings לא נטענו.');
      } else {
        update('offerings', {
          status: 'ok',
          detail: `Offering id=${offering.identifier ?? '(ללא)'} | תיאור: ${offering.serverDescription ?? '—'}`,
          durationMs: offeringsDuration,
        });
      }
    } catch (e) {
      const err = e as Error;
      update('offerings', { status: 'fail', detail: `שגיאה: ${err?.message ?? String(e)}`, durationMs: offeringsDuration });
      errors.push('getOfferings זרק שגיאה: ' + (err?.message ?? ''));
    }

    // 4. Packages
    update('packages', { status: 'running' });
    const packages = offering?.availablePackages ?? [];
    if (packages.length === 0) {
      update('packages', {
        status: 'fail',
        detail: '0 packages. בדוק ב-RevenueCat Dashboard → Offerings → Default — שהמוצרים מוצמדים כ-Packages ($rc_monthly / $rc_annual).',
      });
      errors.push('אין packages ב-Offering.');
    } else {
      const lines = packages.map(
        (p) => `• ${p.identifier ?? '?'} (${p.packageType ?? '?'}) → ${p.product?.identifier ?? '?'} ${p.product?.priceString ? '· ' + p.product.priceString : ''}`
      );
      update('packages', {
        status: 'ok',
        detail: `נמצאו ${packages.length} packages:\n${lines.join('\n')}`,
      });
    }

    // 5. Product match
    update('directProducts', { status: 'running' });
    let directProducts: Awaited<ReturnType<typeof getStoreProducts>> = [];
    try {
      const start = Date.now();
      directProducts = await getStoreProducts();
      const dur = Date.now() - start;
      if (directProducts.length === 0) {
        update('directProducts', {
          status: 'fail',
          detail: `StoreKit החזיר 0 מוצרים בבדיקה ישירה.
זה אומר שהבעיה לפני RevenueCat Offering: Bundle ID, סטטוס המוצרים ב-App Store Connect, הסכם Paid Apps, Sandbox Tester, או שה-Build לא כולל In-App Purchase capability.`,
          durationMs: dur,
        });
        errors.push('StoreKit לא מחזיר מוצרים בבדיקה ישירה.');
      } else {
        update('directProducts', {
          status: 'ok',
          detail: `StoreKit מצא ${directProducts.length} מוצרים:
${directProducts.map((p) => `• ${p.identifier} ${p.priceString ? '· ' + p.priceString : ''}`).join('\n')}`,
          durationMs: dur,
        });
      }
    } catch (e) {
      const err = e as Error;
      update('directProducts', { status: 'fail', detail: `שגיאה: ${err?.message ?? String(e)}` });
      errors.push('getProducts ישיר נכשל: ' + (err?.message ?? ''));
    }

    // 6. Product match
    update('products', { status: 'running' });
    const foundIds = new Set([
      ...packages.map((p) => p.product?.identifier).filter(Boolean),
      ...directProducts.map((p) => p.identifier).filter(Boolean),
    ]);
    const expectedIds = ALL_PRODUCT_IDS;
    const missing = expectedIds.filter((id) => !foundIds.has(id));
    const hasMonthly = foundIds.has(PRODUCT_MONTHLY);
    const hasYearly = foundIds.has(PRODUCT_YEARLY);
    if (missing.length === 0 && expectedIds.length > 0) {
      update('products', {
        status: 'ok',
        detail: `כל המוצרים נמצאו:\n• Monthly: ${PRODUCT_MONTHLY} ✓\n• Yearly: ${PRODUCT_YEARLY} ✓`,
      });
    } else if (missing.length === expectedIds.length) {
      update('products', {
        status: 'fail',
        detail: `אף Product ID לא נמצא ב-Offering!\nמצופה: ${expectedIds.join(', ')}\nנמצא בפועל: ${[...foundIds].join(', ') || '(ריק)'}\nסיבות: המוצרים לא ב-Ready to Submit ב-App Store Connect, או לא הוצמדו ל-Default Offering ב-RevenueCat.`,
      });
      errors.push('אף Product ID לא תואם.');
    } else {
      update('products', {
        status: 'warn',
        detail: `חלק מהמוצרים חסרים:\n• Monthly (${PRODUCT_MONTHLY}): ${hasMonthly ? '✓' : '✗ חסר'}\n• Yearly (${PRODUCT_YEARLY}): ${hasYearly ? '✓' : '✗ חסר'}`,
      });
      errors.push('Product IDs חסרים: ' + missing.join(', '));
    }

    // 7. CustomerInfo
    update('customer', { status: 'running' });
    try {
      const start = Date.now();
      const info = await refreshPremiumStatus();
      const dur = Date.now() - start;
      const checkedAt = new Date().toLocaleString('he-IL');
      setPremiumCheckedAt(checkedAt);
      if (info === null) {
        update('customer', { status: 'fail', detail: 'refreshPremiumStatus החזיר null', durationMs: dur });
      } else {
        update('customer', {
          status: 'ok',
          detail: `isPremium=${info.isPremium} | productId=${info.productId ?? '—'} | expiresAt=${info.expiresAt ?? '—'}\nנבדק ב: ${checkedAt}`,
          durationMs: dur,
        });
      }
    } catch (e) {
      const err = e as Error;
      update('customer', { status: 'fail', detail: `שגיאה: ${err?.message ?? String(e)}` });
      errors.push('CustomerInfo נכשל: ' + (err?.message ?? ''));
    }

    setLastRunAt(new Date().toLocaleString('he-IL'));
    if (errors.length === 0) {
      setSummary('✅ הכל עובד תקין. הרכישות אמורות לעבוד.');
    } else {
      setSummary(`❌ ${errors.length} בעיות זוהו:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);
    }
    setRunning(false);
  };

  useEffect(() => {
    if (autoRun && !autoRunRef.current) {
      autoRunRef.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  const copyReport = async () => {
    const report = [
      `=== Daily Dominator — Subscription Diagnostics ===`,
      `Time: ${lastRunAt ?? 'לא הופעל'}`,
      `Platform: ${Capacitor.getPlatform()} | Native: ${Capacitor.isNativePlatform()}`,
      ``,
      ...steps.map((s) => {
        const icon = s.status === 'ok' ? '✅' : s.status === 'fail' ? '❌' : s.status === 'warn' ? '⚠️' : '⏳';
        return `${icon} ${s.label}${s.durationMs ? ` (${s.durationMs}ms)` : ''}\n${s.detail ?? ''}`;
      }),
      ``,
      `--- RC Init Trace (${trace.length} entries) ---`,
      ...trace.map((t) => `[+${t.tMs}ms] [${t.scope}] ${t.label}${t.data ? `\n    ${t.data.replace(/\n/g, '\n    ')}` : ''}`),
      ``,
      `--- Summary ---`,
      summary ?? '',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      toast.success('הדוח הועתק. הדבק כאן בצ׳אט.');
    } catch {
      toast.error('העתקה נכשלה');
    }
  };

  return (
    <div className="rounded-lg border border-border/40 bg-background/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">אבחון מנויים</span>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={running} className="gap-2 h-7 text-xs">
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
          {running ? 'בודק...' : 'הרץ אבחון'}
        </Button>
      </div>

      {lastRunAt && (
        <div className="text-[10px] text-muted-foreground">
          נבדק לאחרונה: {lastRunAt}
          {premiumCheckedAt && ` · Premium נבדק: ${premiumCheckedAt}`}
        </div>
      )}

      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.key} className="rounded border border-border/30 bg-background/40 p-2">
            <div className="flex items-center gap-2">
              <StatusIcon status={s.status} />
              <span className="text-xs font-medium">{s.label}</span>
              {s.durationMs !== undefined && (
                <span className="text-[10px] text-muted-foreground mr-auto">{s.durationMs}ms</span>
              )}
            </div>
            {s.detail && (
              <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono mt-1.5 leading-relaxed">
                {s.detail}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="rounded border border-accent/40 bg-background/40 p-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-accent">RC Init Trace ({trace.length})</span>
          <Button
            size="sm"
            variant="outline"
            disabled={trace.length === 0}
            onClick={async () => {
              const text = trace
                .map((t) => `[+${t.tMs}ms] [${t.scope}] ${t.label}${t.data ? `\n    ${t.data.replace(/\n/g, '\n    ')}` : ''}`)
                .join('\n');
              try {
                await navigator.clipboard.writeText(text || '(empty)');
                toast.success(`הועתקו ${trace.length} שלבים`);
              } catch {
                toast.error('העתקה נכשלה');
              }
            }}
            className="h-6 text-[10px] gap-1"
          >
            <Copy className="w-3 h-3" /> העתק Trace
          </Button>
        </div>
        {trace.length === 0 ? (
          <div className="text-[10px] text-muted-foreground">אין עדיין רישומים. הרץ אבחון.</div>
        ) : (
          <div className="space-y-0.5 max-h-[600px] overflow-y-auto font-mono border border-border/20 rounded p-1">
            {trace.map((t, i) => {
              const isInit = t.scope === 'init-trace';
              const isLast = i === trace.length - 1;
              return (
                <div
                  key={i}
                  className={`text-[10px] leading-snug ${isInit ? 'text-foreground' : 'text-muted-foreground'} ${isLast ? 'bg-accent/10 rounded px-1' : ''}`}
                >
                  <span className="text-accent">[+{t.tMs}ms]</span>{' '}
                  <span className="opacity-60">[{t.scope}]</span>{' '}
                  <span className="font-semibold">{t.label}</span>
                  {t.data && (
                    <pre className="text-[9px] opacity-70 whitespace-pre-wrap mr-3">{t.data}</pre>
                  )}
                </div>
              );
            })}
            {running && (
              <div className="text-[10px] text-accent animate-pulse">⏳ ממתין לשלב הבא…</div>
            )}
          </div>
        )}
        {trace.length > 0 && !running && (
          <div className="text-[10px] text-accent font-semibold border-t border-accent/30 pt-1 mt-1">
            ⬅ השלב האחרון שהושלם: {trace[trace.length - 1].label}
          </div>
        )}
      </div>

      {summary && (
        <pre className="text-[11px] whitespace-pre-wrap font-mono p-2 rounded border border-border/40 bg-background/50 leading-relaxed">
          {summary}
        </pre>
      )}

      {lastRunAt && (
        <Button size="sm" variant="ghost" onClick={copyReport} className="w-full h-7 text-xs gap-2">
          <Copy className="w-3 h-3" />
          העתק דוח (לשליחה אליי)
        </Button>
      )}
    </div>
  );
};
