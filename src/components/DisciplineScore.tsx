import { useMemo, useState, useEffect, useRef } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael } from '@/lib/dateUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, TrendingUp, TrendingDown, Minus, Flame, Target, Swords, Footprints, Droplets } from 'lucide-react';
import { DayOfWeek } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const useCountUp = (target: number, duration = 1200) => {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current !== target ? 0 : current;
    prevTarget.current = target;
    if (target === 0) { setCurrent(0); return; }

    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + (target - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
};

const DisciplineScore = () => {
  const { getDailyCompletionPercent, stats, tasks } = useTaskContext();
  const { user } = useAuth();
  
  const [nutritionScore, setNutritionScore] = useState(0);
  const [sleepScore, setSleepScore] = useState(0);
  const [stepsScore, setStepsScore] = useState(0);
  const [waterScore, setWaterScore] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchExtraData = async () => {
      const todayStr = getNowInIsrael().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      
      const [logsRes, profileRes, habitRes, healthRes] = await Promise.all([
        supabase.from('nutrition_logs').select('calories').eq('user_id', user.id).eq('log_date', todayStr),
        supabase.from('nutrition_profiles').select('daily_calories').eq('user_id', user.id).maybeSingle(),
        supabase.from('habits').select('completed').eq('user_id', user.id).eq('habit_date', todayStr).eq('habit_id', 'sleep').maybeSingle(),
        supabase.from('daily_health_logs').select('*').eq('user_id', user.id).eq('log_date', todayStr).maybeSingle()
      ]);

      const cals = logsRes.data?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
      const targetCals = profileRes.data?.daily_calories || 0;
      
      // Nutrition score logic (if within 200 cals of target = 100, else scales down)
      let nScore = 100;
      if (targetCals > 0) {
        const diff = Math.abs(cals - targetCals);
        if (diff > 200) nScore = Math.max(0, 100 - ((diff - 200) / 10));
      } else {
        nScore = cals > 0 ? 50 : 0; // If they tracked but no target
      }
      setNutritionScore(nScore);
      
      setSleepScore(habitRes.data?.completed ? 100 : 0);
      
      const steps = healthRes.data?.steps || 0;
      setStepsScore(Math.min(100, Math.round((steps / 10000) * 100)));
      
      const water = Number(healthRes.data?.water_liters || 0);
      setWaterScore(Math.min(100, Math.round((water / 2) * 100)));
    };
    fetchExtraData();
  }, [user]);

  const { score, completionPct, streak, hardTaskBonus, trend, weekScores } = useMemo(() => {
    const now = getNowInIsrael();
    const completionPct = getDailyCompletionPercent(now);
    const streak = stats.streak;

    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const todayDay = dayNames[now.getDay()] as DayOfWeek;
    
    let hardTotal = 0;
    let hardDone = 0;
    tasks.forEach(t => {
      if (!t.days.includes(todayDay)) return;
      const isHard = t.category === 'כושר' || t.startTime < '07:00' || t.category === 'משמעת';
      if (isHard) {
        hardTotal++;
        if (t.completions[todayStr]) hardDone++;
      }
    });
    const hardTaskBonus = hardTotal > 0 ? Math.round((hardDone / hardTotal) * 100) : 100;

    const streakScore = Math.min(streak / 30, 1) * 100;
    
    // NEW SCORE CALCULATION: 30% completion, 10% streak, 15% hard tasks, 15% nutrition, 15% sleep, 10% steps, 5% water
    const baseScore = Math.round(
      completionPct * 0.3 + 
      streakScore * 0.1 + 
      hardTaskBonus * 0.15 + 
      nutritionScore * 0.15 + 
      sleepScore * 0.15 +
      stepsScore * 0.1 +
      waterScore * 0.05
    );

    const scores: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      scores.push(getDailyCompletionPercent(d));
    }

    const firstHalf = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const secondHalf = scores.slice(4).reduce((a, b) => a + b, 0) / 3;
    const trend = secondHalf - firstHalf;

    return { score: baseScore, completionPct, streak, hardTaskBonus, trend, weekScores: scores };
  }, [getDailyCompletionPercent, stats, tasks, nutritionScore, sleepScore, stepsScore, waterScore]);

  const animatedScore = useCountUp(score);
  const animatedCompletion = useCountUp(completionPct);
  const animatedHard = useCountUp(hardTaskBonus);

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-accent';
    if (s >= 40) return 'text-orange-400';
    return 'text-destructive';
  };

  const getGlowColor = (s: number) => {
    if (s >= 80) return 'shadow-green-500/30';
    if (s >= 60) return 'shadow-accent/30';
    if (s >= 40) return 'shadow-orange-500/30';
    return 'shadow-destructive/30';
  };

  const getRank = (s: number) => {
    if (s >= 95) return 'אגדי';
    if (s >= 85) return 'עילית';
    if (s >= 70) return 'יציב';
    if (s >= 50) return 'עולה';
    return 'טירון';
  };

  const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const now = getNowInIsrael();

  return (
    <Card className={`bg-card/80 backdrop-blur-md border-border/50 shadow-2xl ${getGlowColor(score)} transition-all duration-500`}>
      <CardContent className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-3 sm:px-6">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
              ציון משמעת כולל
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold">
            {trend > 5 ? (
              <><TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-400" /><span className="text-green-400">עולה</span></>
            ) : trend < -5 ? (
              <><TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-destructive" /><span className="text-destructive">יורד</span></>
            ) : (
              <><Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" /><span className="text-muted-foreground">יציב</span></>
            )}
          </div>
        </div>

        <div className="text-center mb-3 sm:mb-4 relative">
          <div
            className={`text-7xl sm:text-8xl font-black tracking-tighter transition-all duration-500 ${getScoreColor(score)}`}
            style={score >= 80 ? {
              textShadow: '0 0 30px currentColor, 0 0 60px currentColor',
              filter: 'brightness(1.2)',
            } : undefined}
          >
            {animatedScore}
          </div>
          <div className="text-[11px] sm:text-sm font-black tracking-[0.4em] text-muted-foreground mt-2 uppercase">
            {getRank(score)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <div className="bg-background/50 border border-border/50 rounded-xl p-2 text-center hover:bg-background/80 transition-colors">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto mb-1 text-primary" />
            <div className="text-sm sm:text-base font-black">{animatedCompletion}%</div>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase">משימות</div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-xl p-2 text-center hover:bg-background/80 transition-colors">
            <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto mb-1 text-accent" />
            <div className="text-sm sm:text-base font-black">{animatedHard}%</div>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase">קשות</div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-xl p-2 text-center hover:bg-background/80 transition-colors">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto mb-1 text-orange-400" />
            <div className="text-sm sm:text-base font-black">{nutritionScore}%</div>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase">תזונה</div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-xl p-2 text-center hover:bg-background/80 transition-colors">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto mb-1 text-indigo-400" />
            <div className="text-sm sm:text-base font-black">{sleepScore}%</div>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase">שינה</div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-xl p-2 text-center hover:bg-background/80 transition-colors">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto mb-1 text-green-400" />
            <div className="text-sm sm:text-base font-black">{stepsScore}%</div>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase">צעדים</div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-xl p-2 text-center hover:bg-background/80 transition-colors">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto mb-1 text-blue-400" />
            <div className="text-sm sm:text-base font-black">{waterScore}%</div>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase">מים</div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-1 h-16 pt-2 border-t border-border/30">
          {weekScores.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="text-[8px] sm:text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-bold">{s > 0 ? s : ''}</div>
              <div
                className={`w-full rounded-md transition-all duration-500 hover:brightness-125 ${
                  s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-accent' : s >= 40 ? 'bg-orange-500' : 'bg-destructive'
                }`}
                style={{ height: `${Math.max(4, s * 0.4)}px` }}
              />
              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-bold">
                {days[new Date(new Date(now).setDate(now.getDate() - 6 + i)).getDay()]}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DisciplineScore;
