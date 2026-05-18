import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ApplyPlanDialog from '@/components/ApplyPlanDialog';
import { ChevronRight, ChevronLeft, Loader2, Sparkles } from 'lucide-react';

interface Props { onComplete: () => void; }

type A = {
  gender: string; age: number; height: number; weight: number;
  goal: string; experience: string; daysPerWeek: number;
  location: string; trainingTime: string; activity: string; diet: string;
};

const initial: A = {
  gender: '', age: 25, height: 175, weight: 75,
  goal: '', experience: '', daysPerWeek: 4,
  location: '', trainingTime: '', activity: '', diet: '',
};

const GOALS = [
  { v: 'חיטוב', label: 'חיטוב', sub: 'ירידה במשקל ובשומן', emoji: '🔥' },
  { v: 'recomp', label: 'עלייה בשריר + ירידה בשומן', sub: 'שינוי הרכב גוף', emoji: '⚡' },
  { v: 'מסה', label: 'מסה', sub: 'עלייה במשקל ובשריר', emoji: '💪' },
  { v: 'כללי', label: 'כושר כללי', sub: 'בריאות ואנרגיה', emoji: '🏃' },
];

const LOCATIONS = [
  { v: 'חדר כושר', emoji: '🏋️', sub: 'מכשירים ומשקולות חופשיות' },
  { v: 'בית עם משקולות', emoji: '🏠', sub: 'דמבלים, קטלבל, גומיות' },
  { v: 'בית בלי ציוד', emoji: '🛋️', sub: 'משקל גוף בלבד' },
  { v: 'קליסטניקס', emoji: '🤸', sub: 'מתח, מקבילים, משקל גוף מתקדם' },
];

const EXP = [
  { v: 'מתחיל', sub: 'פחות משנה ניסיון' },
  { v: 'בינוני', sub: 'שנה עד שלוש שנים' },
  { v: 'מתקדם', sub: 'שלוש שנים ומעלה' },
];

const TIMES = [
  { v: 'בוקר', emoji: '🌅' },
  { v: 'צהריים', emoji: '☀️' },
  { v: 'ערב', emoji: '🌙' },
];

const ACTIVITY = [
  { v: 'יושבני', sub: 'עבודה משרדית, מעט הליכה' },
  { v: 'בינוני', sub: 'פעילות סבירה ביום' },
  { v: 'פעיל', sub: 'הרבה תנועה או עבודה פיזית' },
];

const DIETS = [
  { v: 'הכל', emoji: '🍽️' },
  { v: 'צמחוני', emoji: '🥗' },
  { v: 'טבעוני', emoji: '🌱' },
  { v: 'ללא גלוטן', emoji: '🌾' },
];

function Card({ active, onClick, row, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full p-4 rounded-2xl border-2 transition-all duration-300 active:scale-[0.97] overflow-hidden ${
        active
          ? 'border-primary bg-gradient-to-br from-primary/25 via-card to-card shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.6),inset_0_1px_0_hsl(var(--primary)/0.5)] scale-[1.02]'
          : 'border-border/60 bg-card hover:border-primary/60 hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.3)] hover:-translate-y-0.5'
      } ${row ? 'flex items-center gap-3 text-right' : 'flex flex-col items-center justify-center text-center min-h-[120px]'}`}
    >
      {/* Shine sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      {/* Active markers */}
      {active && (
        <>
          <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <span className="pointer-events-none absolute top-2 left-2 w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
        </>
      )}
      <span className="relative z-10 contents">{children}</span>
    </button>
  );
}

const OnboardingFlow = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<A>(initial);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [showApply, setShowApply] = useState(false);

  const upd = <K extends keyof A>(k: K, v: A[K]) => setA(p => ({ ...p, [k]: v }));

  const steps = [
    { title: 'בוא נכיר אותך', sub: 'מה המגדר שלך?', valid: !!a.gender, render: () => (
      <div className="grid grid-cols-2 gap-3">
        {['זכר','נקבה'].map(g => (
          <Card key={g} active={a.gender===g} onClick={()=>upd('gender',g)}>
            <div className="text-5xl mb-2">{g==='זכר'?'🧔':'👩'}</div>
            <div className="font-bold text-lg">{g}</div>
          </Card>
        ))}
      </div>
    )},
    { title: 'בן או בת כמה?', sub: 'הגיל יעזור להתאים תזונה', valid: a.age>=15&&a.age<=80, render: () => (
      <div className="space-y-6 px-2">
        <div className="text-center">
          <div className="text-7xl font-black text-primary">{a.age}</div>
          <div className="text-muted-foreground mt-1">שנים</div>
        </div>
        <Slider min={15} max={80} step={1} value={[a.age]} onValueChange={v=>upd('age',v[0])} />
      </div>
    )},
    { title: 'גובה ומשקל', sub: 'קובע את הקלוריות שלך', valid: a.height>=130&&a.weight>=35, render: () => (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold mb-1 block">גובה בסנטימטר</label>
          <Input type="number" value={a.height} onChange={e=>upd('height',+e.target.value)} className="text-2xl text-center font-bold h-14" />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1 block">משקל בקילו</label>
          <Input type="number" value={a.weight} onChange={e=>upd('weight',+e.target.value)} className="text-2xl text-center font-bold h-14" />
        </div>
      </div>
    )},
    { title: 'מה המטרה שלך?', sub: 'נתאים את התוכנית בדיוק לזה', valid: !!a.goal, render: () => (
      <div className="grid grid-cols-1 gap-2.5">
        {GOALS.map(g => (
          <Card key={g.v} active={a.goal===g.v} onClick={()=>upd('goal',g.v)} row>
            <div className="text-4xl">{g.emoji}</div>
            <div className="flex-1 text-right">
              <div className="font-bold">{g.label}</div>
              <div className="text-xs text-muted-foreground">{g.sub}</div>
            </div>
          </Card>
        ))}
      </div>
    )},
    { title: 'רמת ניסיון באימונים', sub: '', valid: !!a.experience, render: () => (
      <div className="grid grid-cols-1 gap-2.5">
        {EXP.map(e => (
          <Card key={e.v} active={a.experience===e.v} onClick={()=>upd('experience',e.v)} row>
            <div className="flex-1 text-right">
              <div className="font-bold">{e.v}</div>
              <div className="text-xs text-muted-foreground">{e.sub}</div>
            </div>
          </Card>
        ))}
      </div>
    )},
    { title: 'כמה ימים בשבוע תתאמן?', sub: 'תהיה ריאלי', valid: a.daysPerWeek>=2, render: () => (
      <div className="space-y-6 px-2">
        <div className="text-center">
          <div className="text-7xl font-black text-accent">{a.daysPerWeek}</div>
          <div className="text-muted-foreground mt-1">ימים בשבוע</div>
        </div>
        <Slider min={2} max={6} step={1} value={[a.daysPerWeek]} onValueChange={v=>upd('daysPerWeek',v[0])} />
      </div>
    )},
    { title: 'איפה תתאמן?', sub: 'התוכנית תיבנה לפי הציוד', valid: !!a.location, render: () => (
      <div className="grid grid-cols-1 gap-2.5">
        {LOCATIONS.map(l => (
          <Card key={l.v} active={a.location===l.v} onClick={()=>upd('location',l.v)} row>
            <div className="text-3xl">{l.emoji}</div>
            <div className="flex-1 text-right">
              <div className="font-bold">{l.v}</div>
              <div className="text-xs text-muted-foreground">{l.sub}</div>
            </div>
          </Card>
        ))}
      </div>
    )},
    { title: 'מתי נוח לך להתאמן?', sub: '', valid: !!a.trainingTime, render: () => (
      <div className="grid grid-cols-3 gap-2.5">
        {TIMES.map(t => (
          <Card key={t.v} active={a.trainingTime===t.v} onClick={()=>upd('trainingTime',t.v)}>
            <div className="text-4xl mb-1">{t.emoji}</div>
            <div className="font-bold text-sm">{t.v}</div>
          </Card>
        ))}
      </div>
    )},
    { title: 'רמת פעילות יומית', sub: 'מחוץ לאימונים', valid: !!a.activity, render: () => (
      <div className="grid grid-cols-1 gap-2.5">
        {ACTIVITY.map(x => (
          <Card key={x.v} active={a.activity===x.v} onClick={()=>upd('activity',x.v)} row>
            <div className="flex-1 text-right">
              <div className="font-bold">{x.v}</div>
              <div className="text-xs text-muted-foreground">{x.sub}</div>
            </div>
          </Card>
        ))}
      </div>
    )},
    { title: 'העדפות תזונה', sub: '', valid: !!a.diet, render: () => (
      <div className="grid grid-cols-2 gap-2.5">
        {DIETS.map(d => (
          <Card key={d.v} active={a.diet===d.v} onClick={()=>upd('diet',d.v)}>
            <div className="text-4xl mb-1">{d.emoji}</div>
            <div className="font-bold text-sm">{d.v}</div>
          </Card>
        ))}
      </div>
    )},
  ];

  const total = steps.length;
  const cur = steps[step];
  const progress = ((step + 1) / total) * 100;

  const next = () => { if (step < total - 1) setStep(step + 1); else generate(); };
  const back = () => { if (step > 0) setStep(step - 1); };

  const generate = async () => {
    setGenerating(true);
    try {
      const goalText =
        a.goal === 'recomp' ? 'עלייה בשריר וירידה בשומן במקביל (body recomposition)' :
        a.goal === 'חיטוב' ? 'ירידה במשקל ובאחוזי שומן (cutting)' :
        a.goal === 'מסה' ? 'עלייה במסת שריר ובמשקל (bulking)' :
        'כושר כללי ובריאות';

      const splitHint = a.location === 'קליסטניקס'
        ? 'תוכנית קליסטניקס טהורה — רק תרגילי משקל גוף: מתח, מקבילים, שכיבות סמיכה, סקוואט, פלאנק, מאדאפ, פיסטול סקוואט, ארצ׳ר פושאפס וכו. ללא משקולות. התאם פרוגרסיות לפי רמת המתאמן.'
        : a.location === 'בית בלי ציוד'
        ? 'תוכנית משקל גוף ביתית — שכיבות סמיכה, סקוואט, מתפרצים, פלאנק, ברפיז, וכו.'
        : a.location === 'בית עם משקולות'
        ? 'תוכנית עם דמבלים וגומיות בלבד.'
        : 'תוכנית חדר כושר מלאה.';

      const text = `פרופיל משתמש:
- מגדר: ${a.gender}, גיל: ${a.age}, גובה: ${a.height} ס"מ, משקל: ${a.weight} ק"ג
- מטרה: ${goalText}
- ניסיון: ${a.experience}
- ${a.daysPerWeek} ימי אימון בשבוע, בשעות ${a.trainingTime}
- מקום אימון: ${a.location}
- רמת פעילות יומית: ${a.activity}
- העדפת תזונה: ${a.diet}

${splitHint}

חשב BMR וצרכי קלוריות לפי משקל/גובה/גיל/מין/פעילות והתאם למטרה (גירעון של 400 קק"ל לחיטוב, עודף של 300 קק"ל למסה, איזון ל-recomp/כללי).
חלבון: 1.8-2.2 גרם לק"ג. מים: 35 מ"ל לק"ג משקל. שינה: 7-8 שעות.
פצל את ${a.daysPerWeek} ימי האימון לימי השבוע (התחל מיום ראשון). לכל יום תן focus ותרגילים מלאים (שם, סטים×חזרות, מופרדים בפסיק).`;

      const { data, error } = await supabase.functions.invoke('ai-plan-extract', {
        body: { analysisText: text },
      });
      if (error) throw error;
      setPlan(data?.plan || {});
      setShowApply(true);
    } catch (e) {
      console.error(e);
      toast.error('שגיאה ביצירת התוכנית');
      setGenerating(false);
    }
  };

  const finish = () => {
    if (user) localStorage.setItem(`onboarding_done_${user.id}`, '1');
    onComplete();
  };

  if (generating && !showApply) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="relative inline-block">
            <div className="text-7xl animate-pulse">🔥</div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-accent animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-black mb-2">בונה לך תוכנית מותאמת...</h2>
            <p className="text-sm text-muted-foreground">ה-AI מחשב קלוריות, מאקרו, ומפצל לך אימונים לפי המטרה</p>
          </div>
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 shrink-0 bg-background/70 backdrop-blur-xl border-b border-border/30 px-4 pt-6 pb-4 safe-top">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              שלב <span className="text-foreground">{step + 1}</span> / {total}
            </span>
            <span className="text-xs font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="relative h-1 bg-secondary/60 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-primary via-primary to-accent rounded-full transition-all duration-700 shadow-[0_0_12px_hsl(var(--primary)/0.8)]"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_hsl(var(--accent))] transition-all duration-700"
              style={{ right: `calc(${progress}% - 5px)` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-md mx-auto px-5 pt-8 pb-28 flex flex-col justify-center">
          <div key={step} className="animate-fade-in space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm">
                <Sparkles className="w-3 h-3 text-accent" />
                <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent">בניית פרופיל</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                {cur.title}
              </h2>
              {cur.sub && <p className="text-sm text-muted-foreground/90">{cur.sub}</p>}
            </div>
            <div className="relative">{cur.render()}</div>
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="sticky bottom-0 z-20 bg-background/70 backdrop-blur-xl border-t border-border/30 p-4 safe-bottom">
        <div className="max-w-md mx-auto flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={back} className="gap-1 h-12 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-primary/40">
              <ChevronRight className="w-4 h-4" />
              חזור
            </Button>
          )}
          <Button
            onClick={next}
            disabled={!cur.valid}
            className="flex-1 gap-1.5 h-12 text-base font-black tracking-wide bg-gradient-to-l from-primary via-primary to-primary/90 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300 disabled:opacity-40"
          >
            {step === total - 1 ? (<><Sparkles className="w-5 h-5" /> בנה לי תוכנית</>) : (<>הבא <ChevronLeft className="w-4 h-4" /></>)}
          </Button>
        </div>
      </div>

      {plan && (
        <ApplyPlanDialog
          open={showApply}
          onOpenChange={(v) => { setShowApply(v); if (!v) finish(); }}
          initialPlan={plan}
        />
      )}
    </div>
  );
};

export default OnboardingFlow;
