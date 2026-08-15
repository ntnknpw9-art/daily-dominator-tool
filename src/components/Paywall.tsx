import { useMemo, useState } from 'react';
import { Crown, Check, Loader2, X, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { MANAGE_SUBSCRIPTIONS_URL, type PlanOption } from '@/lib/subscription';
import LegalDialog, { type LegalKind } from '@/components/LegalDialog';

const BENEFITS = [
  'תמיכה ישירה בפיתוח האפליקציה ובעדכונים החדשים',
  'גישה מלאה לכל הכלים: משימות, אימונים, תזונה ומעקב',
  'ניתוחים מתקדמים, יעדים שבועיים ודוחות התקדמות',
  'תמיכה מהירה בפניות ושיפורים לפי בקשות תומכים',
];

const planTitle = (plan: PlanOption) =>
  plan.period === 'year' ? 'מנוי שנתי' : plan.period === 'month' ? 'מנוי חודשי' : 'מנוי';

const planPeriodLabel = (plan: PlanOption) =>
  plan.period === 'year' ? 'לשנה · מתחדש כל 12 חודשים' : 'לחודש · מתחדש כל חודש';

const currency = (value: number, code: string) => {
  try {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: code || 'ILS' }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
};

function PlanCard({
  plan, selected, onSelect, savingsLabel, perMonthLabel,
}: {
  plan: PlanOption;
  selected: boolean;
  onSelect: () => void;
  savingsLabel?: string | null;
  perMonthLabel?: string | null;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        'relative flex min-h-[76px] w-full items-center justify-between rounded-2xl border p-4 text-right transition',
        selected
          ? 'border-primary bg-card shadow-[0_0_24px_-8px_hsl(var(--primary)/0.7)]'
          : 'border-border bg-card/60 hover:bg-card',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className={[
          'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
        ].join(' ')}>
          {selected && <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{planTitle(plan)}</span>
            {savingsLabel && (
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                {savingsLabel}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{planPeriodLabel(plan)}</div>
          {perMonthLabel && (
            <div className="mt-0.5 text-[11px] text-muted-foreground/80">{perMonthLabel}</div>
          )}
        </div>
      </div>
      <div className="text-left text-lg font-bold tracking-tight">{plan.priceString}</div>
    </button>
  );
}

const Paywall = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { status, error, isWorking, plans, isSubscribed, renewsAt, storeUnavailable, refresh, purchase, restore } = useSubscription();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [legal, setLegal] = useState<LegalKind | null>(null);

  const yearly = plans.find((p) => p.period === 'year') ?? null;
  const monthly = plans.find((p) => p.period === 'month') ?? null;
  const selected = plans.find((p) => p.packageIdentifier === selectedId) ?? yearly ?? plans[0] ?? null;

  const savingsLabel = useMemo(() => {
    if (!yearly || !monthly || !monthly.price || !yearly.price) return null;
    const pct = Math.round(((monthly.price * 12 - yearly.price) / (monthly.price * 12)) * 100);
    return pct > 0 ? `חיסכון ${pct}%` : null;
  }, [yearly, monthly]);

  const perMonthLabel = useMemo(() => {
    if (!yearly?.price) return null;
    return `שווה ערך ל־${currency(yearly.price / 12, yearly.currencyCode)} לחודש`;
  }, [yearly]);

  const handlePurchase = async () => {
    if (!selected) return;
    if (storeUnavailable) {
      toast.info('רכישות זמינות באפליקציה על iPhone בלבד');
      return;
    }
    try {
      const ok = await purchase(selected.packageIdentifier);
      toast[ok ? 'success' : 'info'](ok ? 'המנוי הופעל — תודה על התמיכה!' : 'הרכישה לא הושלמה');
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (err?.userCancelled) return;
      toast.error(err?.message || 'הרכישה נכשלה. נסה שוב.');
    }
  };

  const handleRestore = async () => {
    if (storeUnavailable) {
      toast.info('שחזור רכישות זמין באפליקציה על iPhone בלבד');
      return;
    }
    try {
      const ok = await restore();
      toast[ok ? 'success' : 'info'](ok ? 'הרכישות שוחזרו' : 'לא נמצאו רכישות לשחזור');
    } catch (e) {
      toast.error((e as Error)?.message || 'שחזור הרכישות נכשל');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="rounded-none border-0 overflow-y-auto p-0 [&>button]:hidden"
          style={{ left: 0, top: 0, transform: 'none', width: '100vw', maxWidth: '100vw', height: '100dvh', maxHeight: '100dvh' }}
          dir="rtl"
        >
          <div className="flex flex-col px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] animate-fade-in">
            {/* Top bar: close (X) + restore */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="סגור"
                className="grid size-11 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition active:scale-95"
              >
                <X className="size-5" />
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={isWorking}
                className="min-h-[44px] px-3 text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
              >
                שחזור רכישות
              </button>
            </div>

            {/* Hero */}
            <div className="mt-3 flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                <Crown className="size-3.5" fill="currentColor" /> Premium
              </span>
              <div className="mt-4 grid size-20 place-items-center rounded-[22px] border border-primary/40 bg-gradient-to-br from-primary/30 to-primary/10 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)]">
                <Crown className="size-10 text-primary" />
              </div>
              <DialogTitle className="mt-4 text-2xl font-bold tracking-tight">מנוי תמיכה</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                כל פיצ׳רי האפליקציה זמינים לכולם. המנוי הוא דרך לתמוך בפיתוח.
              </DialogDescription>
            </div>

            {/* Benefits */}
            <ul className="mt-5 space-y-2.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {/* States */}
            {status === 'loading' && (
              <div className="mt-6 space-y-2.5">
                <div className="h-[76px] animate-pulse rounded-2xl bg-muted/40" />
                <div className="h-[76px] animate-pulse rounded-2xl bg-muted/40" />
                <div className="mt-4 h-14 animate-pulse rounded-2xl bg-muted/40" />
              </div>
            )}

            {status === 'error' && (
              <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-primary/10 px-4 text-sm font-medium text-primary"
                >
                  <RefreshCw className="size-4" /> נסה שוב
                </button>
              </div>
            )}

            {status === 'ready' && isSubscribed && (
              <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-center">
                <div className="text-base font-semibold text-primary">המנוי שלך פעיל</div>
                {renewsAt && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    מתחדש בתאריך {new Date(renewsAt).toLocaleDateString('he-IL')}
                  </div>
                )}
                <a
                  href={MANAGE_SUBSCRIPTIONS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-sm font-semibold text-primary"
                >
                  ניהול / ביטול מנוי בהגדרות Apple ID
                </a>
              </div>
            )}

            {status === 'ready' && !isSubscribed && plans.length === 0 && (
              <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-4 text-center text-sm text-muted-foreground">
                מוצרי המנוי לא זמינים כרגע מ-App Store.
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-sm font-medium text-primary"
                >
                  <RefreshCw className="size-4" /> נסה שוב
                </button>
              </div>
            )}

            {status === 'ready' && !isSubscribed && plans.length > 0 && (
              <>
                <div role="radiogroup" aria-label="בחירת מסלול מנוי" className="mt-6 space-y-2.5">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.packageIdentifier || plan.productIdentifier}
                      plan={plan}
                      selected={selected?.packageIdentifier === plan.packageIdentifier}
                      onSelect={() => setSelectedId(plan.packageIdentifier)}
                      savingsLabel={plan.period === 'year' ? savingsLabel : null}
                      perMonthLabel={plan.period === 'year' ? perMonthLabel : null}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={isWorking || !selected}
                  className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_0_30px_-5px_hsl(var(--primary)/0.6)] transition active:scale-[0.98] disabled:opacity-60"
                >
                  {isWorking ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="size-5" />
                      <span>
                        המשך · {selected?.priceString} {selected?.period === 'year' ? 'לשנה' : 'לחודש'}
                      </span>
                    </>
                  )}
                </button>

                {storeUnavailable && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    תצוגה מקדימה בלבד — רכישות זמינות באפליקציית ה-iPhone.
                  </p>
                )}
              </>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              <span>תשלום מאובטח דרך App Store</span>
            </div>

            {/* Apple 3.1.2 disclosure */}
            <div className="mt-4 space-y-2 text-right text-[11px] leading-5 text-muted-foreground/85">
              <p className="text-center font-medium text-foreground/90">מנוי מתחדש אוטומטית</p>
              <ul className="list-disc space-y-1.5 pr-4 marker:text-muted-foreground/50">
                {monthly && (
                  <li><span className="font-medium text-foreground/80">מנוי חודשי:</span> {monthly.priceString} לחודש.</li>
                )}
                {yearly && (
                  <li><span className="font-medium text-foreground/80">מנוי שנתי:</span> {yearly.priceString} לשנה.</li>
                )}
                <li>התשלום יחויב מחשבון ה-Apple ID שלך עם אישור הרכישה.</li>
                <li>המנוי מתחדש אוטומטית אלא אם החידוש האוטומטי כובה לפחות 24 שעות לפני תום התקופה הנוכחית.</li>
                <li>החשבון יחויב על החידוש תוך 24 השעות שלפני תום התקופה, באותו מחיר.</li>
                <li>ניתן לנהל ולבטל את המנוי בכל עת דרך הגדרות חשבון ה-Apple ID לאחר הרכישה.</li>
                <li>אין תקופת ניסיון חינם.</li>
              </ul>
              <a
                href={MANAGE_SUBSCRIPTIONS_URL}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-primary underline-offset-4 hover:underline"
              >
                ניהול מנוי בהגדרות Apple ID
              </a>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 border-t border-border/30 pt-3 text-[11px] text-muted-foreground">
              <button type="button" onClick={() => setLegal('terms')} className="min-h-[44px] px-2 hover:text-foreground hover:underline">
                תנאי שימוש (EULA)
              </button>
              <span>·</span>
              <button type="button" onClick={() => setLegal('privacy')} className="min-h-[44px] px-2 hover:text-foreground hover:underline">
                מדיניות פרטיות
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LegalDialog open={legal !== null} onOpenChange={(o) => { if (!o) setLegal(null); }} kind={legal ?? 'terms'} />
    </>
  );
};

export default Paywall;
