import { useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael } from '@/lib/dateUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, TrendingUp, TrendingDown, Minus, Flame, Target, Swords } from 'lucide-react';
import { DayOfWeek } from '@/types/task';

const DisciplineScore = () => {
  const { getDailyCompletionPercent, stats, tasks } = useTaskContext();

  const { score, completionPct, streak, hardTaskBonus, trend, weekScores } = useMemo(() => {
    const now = getNowInIsrael();
    const completionPct = getDailyCompletionPercent(now);
    const streak = stats.streak;

    // Hard tasks bonus: count tasks scheduled before 7am or in "אימון" category completed today
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

    // Composite score: 50% completion + 20% streak (capped at 30 days) + 30% hard tasks
    const streakScore = Math.min(streak / 30, 1) * 100;
    const score = Math.round(completionPct * 0.5 + streakScore * 0.2 + hardTaskBonus * 0.3);

    // Week scores for mini chart
    const scores: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      scores.push(getDailyCompletionPercent(d));
    }

    const firstHalf = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const secondHalf = scores.slice(4).reduce((a, b) => a + b, 0) / 3;
    const trend = secondHalf - firstHalf;

    return { score, completionPct, streak, hardTaskBonus, trend, weekScores: scores };
  }, [getDailyCompletionPercent, stats, tasks]);

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
    <Card className={`bg-card border-border/50 shadow-lg ${getGlowColor(score)}`}>
      <CardContent className="pt-5 pb-4">
        {/* Header with rank */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground">
              ציון משמעת
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {trend > 5 ? (
              <><TrendingUp className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">עולה</span></>
            ) : trend < -5 ? (
              <><TrendingDown className="w-3.5 h-3.5 text-destructive" /><span className="text-destructive">יורד</span></>
            ) : (
              <><Minus className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">יציב</span></>
            )}
          </div>
        </div>

        {/* Big score */}
        <div className="text-center mb-4">
          <div className={`text-7xl font-black tracking-tight ${getScoreColor(score)}`}>
            {score}
          </div>
          <div className="text-xs font-bold tracking-[0.3em] text-muted-foreground mt-1 uppercase">
            {getRank(score)}
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <Target className="w-4 h-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold">{completionPct}%</div>
            <div className="text-[10px] text-muted-foreground">השלמה</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <Flame className="w-4 h-4 mx-auto mb-1 text-orange-400" />
            <div className="text-lg font-bold">{streak}</div>
            <div className="text-[10px] text-muted-foreground">סטריק</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <Swords className="w-4 h-4 mx-auto mb-1 text-accent" />
            <div className="text-lg font-bold">{hardTaskBonus}%</div>
            <div className="text-[10px] text-muted-foreground">משימות קשות</div>
          </div>
        </div>

        {/* Week mini chart */}
        <div className="flex items-end justify-between gap-1 h-14">
          {weekScores.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="text-[9px] text-muted-foreground">{s > 0 ? s : ''}</div>
              <div
                className={`w-full rounded-t transition-all ${
                  s >= 80 ? 'bg-green-500/70' : s >= 60 ? 'bg-accent/70' : s >= 40 ? 'bg-orange-500/70' : 'bg-destructive/70'
                }`}
                style={{ height: `${Math.max(2, s * 0.35)}px` }}
              />
              <div className="text-[10px] text-muted-foreground">
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
