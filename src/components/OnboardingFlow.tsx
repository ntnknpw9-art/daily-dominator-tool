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
      className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
        active
          ? 'border-primary bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.3)]'
          : 'border-border/40 bg-card/50 hover:border-primary/50'
      } ${row ? 'flex items-center gap-3 text-right' : 'flex flex-col items-center justify-center text-center'}`}
    >
      {children}
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
        ? 'תוכנית קליסטניקס טהורה — תרגילי משקל גוף בלבד: מתח, מקבילים, ש