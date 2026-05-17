import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ApplyPlanDialog from '@/components/ApplyPlanDialog';
import {
  ChevronRight, ChevronLeft, Loader2, Sparkles,
  Cake, Target, Dumbbell, Calendar,
  MapPin, Clock, Activity, Apple, Flame, Ruler,
} from 'lucide-react';

interface Props {
  onComplete: () => void;
}

type Answers = {
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  experience: string;
  daysPerWeek: number;
  location: string;
  trainingTime: string;
  activity: string;
  diet: string;
};

const initial: Answers = {
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
  { v: 'בית עם משקולות', emoji: '🏠', sub: 'דמבלים / קטלבל / גומיות' },
  { v: 'בית בלי ציוד', emoji: '🛋️', sub: 'משקל גוף בלבד' },
  { v: 'קליסטניקס', emoji: '🤸', sub: 'מתח, מקבילים, משקל גוף מתקדם' },
];

const EXP = [
  { v: 'מתחיל', sub: 'פחות משנה ניסיון' },
  { v: 'בינוני', sub: '1-3 שנים' },
  { v: 'מתקדם', sub: '3+ שנים' },
];

const TIMES = [
  { v: 'בוקר', emoji: '🌅' },
  { v: 'צהריים', emoji: '☀️' },
  { v: 'ערב', emoji: '🌙' },
];

const ACTIVITY = [
  { v: 'יושבני', sub: 'עבודה משרדית, מעט הליכה' },
  { v: 'בינוני', sub: 'פעילות סבירה ביום' },
  { v: 'פעיל', sub: 'הרבה תנועה / עבודה פיזית' },
];

const DIETS = [
  { v: 'הכל', emoji: '🍽️' },
  { v: 'צמחוני', emoji: '🥗' },
  { v: 'טבעוני', emoji: '🌱' },
  { v: 'ללא גלוטן', emoji: '🌾' },
];

const OnboardingFlow = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(initial);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [showApply, setShowApply] = useState(false);

  const update = <K extends keyof Answers>(k: K, v: Answers[K]) => setA(p => ({ ...p, [k]: v }));

  const steps = [
    {
      icon: '👤', title: 'בוא נכיר אותך', sub: 'מה המגדר שלך?',
      valid: !!a.gender,
      render: () => (
        <div className="grid grid-cols-2 gap-3">
          {['זכר', 'נקבה'].map(g => (
            <Card key={g} active={a.gender === g} onClick={() => update('gender', g)}>
              <div className="text-5xl mb-2">{g === 'זכר' ? '🧔' : '👩'}</div>
              <div className="font-bold text-lg">{g}</div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      icon: '🎂', title: 'בן/בת כמה אתה?', sub: 'גיל מדויק יעזור לתכנן את התזונה',
      valid: a.age >= 15 && a.age <= 80,
      render: () => (
        <div className="space-y-6 px-2">
          <div className="text-center">
            <div className="text-7xl font-black text-primary glow-text">{a.age}</div>
            <div className="text-muted-foreground mt-1">שנים</div>
          </div>
          <Slider min={15} max={80} step={1} value={[a.age]} onValueChange={v => update('age', v[0])} />
        </div>
      ),
    },
    {
      icon: '📏', title: 'גובה ומשקל', sub: 'הנתונים האלה קובעים את הקלוריות שלך',
      valid: a.height >= 130 && a.weight >= 35,
      render: () => (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">גובה (ס"מ)</label>
            <Input type="number" value={a.height} onChange={e => update('height', +e.target.value)} className="text-2xl text-center font-bold h-14" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">משקל (ק"ג)</label>
            <Input type="number" value={a.weight} onChange={e => update('weight', +e.target.value)} className="text-2xl text-center font-bold h-14" />
          </div>
        </div>
      ),
    },
    {
      icon: '🎯', title: 'מה המטרה שלך?', sub: 'נתאים את התוכנית בדיוק לזה',
      valid: !!a.goal,
      render: () => (
        <div className="grid grid-cols-1 gap-2.5">
          {GOALS.map(g => (
            <Card key={g.v} active={a.goal === g.v} onClick={() => update('goal', g.v)} row>
              <div className="text-4xl">{g.emoji}</div>
              <div className="flex-1 text-right">
                <div className="font-bold">{g.label}</div>
                <div className="text-xs text-muted-foreground">{g.sub}</div>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      icon: '💪', title: 'רמת הניסיון שלך באימונים?', sub: '',
      valid: !!a.experience,
      render: () => (
        <div className="grid grid-cols-1 gap-2.5">
          {EXP.map(e => (
            <Card key={e.v} active={a.experience === e.v} onClick={() => update('experience', e.v)} row>
              <div className="flex-1 text-right">
                <div className="font-bold">{e.v}</div>
                <div className="text-xs text-muted-foreground">{e.sub}</div>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      icon: '📅', title: 'כמה ימים בשבוע תתאמן?', sub: 'תהיה ריאלי',
      valid: a.daysPerWeek >= 2,
      render: () => (
        <div className="space-y-6 px-2">
          <div className="text-center">
            <div className="text-7xl font-black text-accent glow-text">{a.daysPerWeek}</div>
            <div className="text-muted-foreground mt-1">ימים בשבוע</div>
          </div>
          <Slider min={2} max={6} step={1} value={[a.daysPerWeek]} onValueChange={v => update('daysPerWeek', v[0])} />
        </div>
      ),
    },
    {
      icon: '📍', title: 'איפה תתאמן?', sub: 'התוכנית תיבנה לפי הציוד הזמין',
      valid: !!a.location,
      render: () => (
        <div className="grid grid-cols-1 gap-2.5">
          {LOCATIONS.map(l => (
            <Card key={l.v} active={a.location === l.v} onClick={() => update('location', l.v)} row>
              <div className="text-3xl">{l.emoji}</div>
              <div className="flex-1 text-right">
                <div className="font-bold">{l.v}</div>
                <div className="text-xs text-muted-foreground">{l.sub}</div>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      icon: '⏰', title: 'מתי נוח לך להתאמן?', sub: '',
      valid: !!a.trainingTime,
      render: () => (
        <div className="grid grid-cols-3 gap-2.5">
          {TIMES.map(t => (
            <Card key={t.v} active={a.trainingTime === t.v} onClick={() => update('trainingTime', t.v)}>
              <div className="text-4xl mb-1">{t.emoji}</div>
              <div className="font-bold text-sm">{t.v}</div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      icon: '🏃', title: 'רמת פעילות יומית', sub: 'מחוץ לאימונים',
      valid: !!a.activity,
      render: () => (
        <div className="grid grid-cols-1 gap-2.5">
          {ACTIVITY.map(x => (
            <Card key={x.v} active={a.activity === x.v} onClick={() => update('activity', x.v)} row>
              <div className="flex-1 text-right">
                <div className="font-bold">{x.v}</div>
                <div className="text-xs text-muted-foreground">{x.sub}</div>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      icon: '🥗', title: 'העדפות תזונה', sub: '',
      valid: !!a.diet,
      render: () => (
        <div className="grid grid-cols-2 gap-2.5">
          {DIETS.map(d => (
            <Card key={d.v} active={a.diet === d.v} onClick={() => update('diet', d.v)}>
              <div className="text-4xl mb-1">{d.emoji}</div>
              <div className="font-bold text-sm">{d.v}</div>
            </Card>
          ))}
        </div>
      ),
    },
  ];

  const total = steps.length;
  const cur = steps[step];
  const progress = ((step + 1) / total) * 100;

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else generate();
  };
  const back = () => step > 0 && setStep(step - 1);

  const generate = async () => {
    setGenerating(true);
    try {
      const goalText = a.goal === 'recomp' ? 'עלייה בשריר וירידה בשומן בו ז