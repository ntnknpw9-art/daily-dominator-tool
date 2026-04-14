import { useState, useEffect } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, getTodayStr, formatFullHebrew, getHebrewDayFromDate, timeToMinutes, isNowBetween } from '@/lib/dateUtils';
import { DayOfWeek } from '@/types/task';
import { Check, Clock, Timer, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { playSuccessSound, playWarningSound, createParticleBurst, vibrate } from '@/lib/sounds';

const TodayTab = () => {
  const { getTodayTasks, toggleCompletion } = useTaskContext();
  const [now, setNow] = useState(getNowInIsrael());
  const todayStr = getTodayStr();
  const todayTasks = getTodayTasks();
  const hebrewDay = getHebrewDayFromDate(now) as DayOfWeek;

  // Update clock every 30 seconds for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(getNowInIsrael()), 30000);
    return () => clearInterval(timer);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const getTaskStatus = (startTime: string, endTime: string, done: boolean) => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (done) return 'completed';
    if (nowMinutes < start) return 'upcoming';
    if (nowMinutes >= start && nowMinutes < end) return 'active';
    return 'missed';
  };

  const getTimeRemaining = (endTime: string) => {
    const end = timeToMinutes(endTime);
    const diff = end - nowMinutes;
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0) return `${hours}:${String(mins).padStart(2, '0')} שעות`;
    return `${mins} דקות`;
  };

  const getTimeUntilStart = (startTime: string) => {
    const start = timeToMinutes(startTime);
    const diff = start - nowMinutes;
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0) return `עוד ${hours}:${String(mins).padStart(2, '0')}`;
    return `עוד ${mins} דקות`;
  };

  const getTaskProgress = (startTime: string, endTime: string) => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const total = end - start;
    if (total <= 0) return 0;
    const elapsed = nowMinutes - start;
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  };

  const sorted = [...todayTasks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const completedCount = sorted.filter(t => t.completions[todayStr]).length;
  const totalCount = sorted.length;
  const dailyProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Smart daily goal based on load
  const smartGoal = Math.max(60, Math.min(100, totalCount <= 3 ? 100 : totalCount <= 6 ? 85 : totalCount <= 9 ? 75 : 70));

  return (
    <div className="space-y-4">
      <div className="text-center text-muted-foreground text-sm">
        {formatFullHebrew(now)}
      </div>

      {/* Daily progress summary */}
      {totalCount > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">התקדמות יומית</span>
            <span className="text-sm font-bold">
              {completedCount}/{totalCount}
              <span className={`mr-2 ${dailyProgress >= smartGoal ? 'text-green-400' : 'text-muted-foreground'}`}>
                ({dailyProgress}% מתוך יעד {smartGoal}%)
              </span>
            </span>
          </div>
          <Progress value={dailyProgress} className="h-2.5" />
          {dailyProgress >= smartGoal && (
            <p className="text-xs text-green-400 mt-1 text-center">🎉 עמדת ביעד היומי!</p>
          )}
        </div>
      )}

      {totalCount === 0 && (
        <div className="text-center text-muted-foreground py-12">אין משימות להיום 🎉</div>
      )}

      {sorted.map(task => {
        const done = task.completions[todayStr];
        const detail = task.workoutDetails?.find(wd => wd.day === hebrewDay);
        const status = getTaskStatus(task.startTime, task.endTime, done);
        const progress = getTaskProgress(task.startTime, task.endTime);
        const timeRemaining = getTimeRemaining(task.endTime);
        const timeUntil = getTimeUntilStart(task.startTime);

        const statusConfig = {
          completed: { border: 'border-green-500/50', glow: 'glow-green', badge: '✅ הושלם', badgeColor: 'bg-green-500/20 text-green-400' },
          active: { border: 'border-primary/50', glow: 'glow-red', badge: '🔴 עכשיו', badgeColor: 'bg-primary/20 text-primary' },
          upcoming: { border: 'border-border/50', glow: '', badge: '⏳ בקרוב', badgeColor: 'bg-muted text-muted-foreground' },
          missed: { border: 'border-destructive/50', glow: '', badge: '❌ פספוס', badgeColor: 'bg-destructive/20 text-destructive' },
        }[status];

        return (
          <div key={task.id} className={`glass-card p-5 space-y-2 ${statusConfig.border} ${statusConfig.glow} transition-all`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{task.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusConfig.badgeColor}`}>
                    {statusConfig.badge}
                  </span>
                </div>
                <span className="text-xs text-accent">{task.category}</span>
              </div>
              <div className="text-left">
                <span className="text-sm text-muted-foreground">{task.startTime}–{task.endTime}</span>
                {status === 'active' && timeRemaining && (
                  <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                    <Timer className="w-3 h-3" />
                    נשארו {timeRemaining}
                  </div>
                )}
                {status === 'upcoming' && timeUntil && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3" />
                    {timeUntil}
                  </div>
                )}
              </div>
            </div>

            {/* Active task progress bar */}
            {status === 'active' && !done && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>התקדמות בזמן</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            {/* Missed warning */}
            {status === 'missed' && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                <AlertTriangle className="w-3 h-3" />
                הזמן עבר — עדיין אפשר לסמן!
              </div>
            )}

            <p className="text-sm text-muted-foreground">{task.meaning}</p>
            {detail && <div className="text-sm text-accent bg-secondary/50 rounded px-3 py-1">📋 {detail.description}</div>}
            <Button
              variant={done ? "default" : "outline"}
              className={`w-full ${done ? 'bg-green-600 hover:bg-green-600/90' : status === 'active' ? 'border-primary text-primary hover:bg-primary hover:text-primary-foreground' : ''}`}
              onClick={(e) => {
                const willComplete = !done;
                toggleCompletion(task.id, todayStr);
                if (willComplete) {
                  playSuccessSound();
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  createParticleBurst(rect.left + rect.width / 2, rect.top);
                } else {
                  playWarningSound();
                  vibrate([50, 30, 50]);
                }
              }}
            >
              {done ? <><Check className="w-4 h-4 ml-2" /> הושלם היום ✓</> : status === 'active' ? '🔥 סמן כהושלם עכשיו!' : 'סמן כהושלם'}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default TodayTab;
