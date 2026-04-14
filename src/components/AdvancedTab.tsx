import { useState, useEffect, useRef, useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, getTodayStr, isNowBetween, getNowMinutes, timeToMinutes } from '@/lib/dateUtils';
import { LEVELS, ACHIEVEMENTS, DayOfWeek } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Check, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { getHebrewDayFromDate } from '@/lib/dateUtils';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';

const AdvancedTab = () => {
  const ctx = useTaskContext();
  const { tasks, stats, getTodayTasks, toggleCompletion, getDailyCompletionPercent, getCategoryStats, getFailureAnalysis, timerTaskId, setTimerTaskId } = ctx;

  const today = getNowInIsrael();
  const todayStr = getTodayStr();
  const todayTasks = getTodayTasks().sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dailyPercent = getDailyCompletionPercent(today);

  // War mode
  const nowTask = todayTasks.find(t => isNowBetween(t.startTime, t.endTime));
  const nowMin = getNowMinutes();
  const nextTask = todayTasks.find(t => timeToMinutes(t.startTime) > nowMin);

  // Level
  const currentLevel = [...LEVELS].reverse().find(l => stats.points >= l.minPoints) || LEVELS[0];
  const levelIndex = LEVELS.indexOf(currentLevel);
  const nextLevel = LEVELS[levelIndex + 1];

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTimer = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Achievements
  const totalCompletions = ctx.getTotalCompletions();
  const studyCount = tasks.filter(t => t.category === 'לימודים').reduce((s, t) => s + Object.values(t.completions).filter(Boolean).length, 0);
  const fitnessCount = tasks.filter(t => t.category === 'כושר').reduce((s, t) => s + Object.values(t.completions).filter(Boolean).length, 0);

  const unlockedAchievements = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: a.condition(stats, studyCount, fitnessCount, dailyPercent, totalCompletions),
  }));

  // Live timeline
  const hebrewDay = getHebrewDayFromDate(today) as DayOfWeek;
  const timeline = todayTasks.map(t => {
    const done = t.completions[todayStr];
    const isNow = isNowBetween(t.startTime, t.endTime);
    const isPast = timeToMinutes(t.endTime) <= nowMin;
    let status: string;
    if (done) status = '✅';
    else if (isNow) status = '🔴';
    else if (!isPast) status = '⏳';
    else status = '❌';
    return { ...t, status };
  });

  // Category stats
  const categoryStats = getCategoryStats();
  const failureAnalysis = getFailureAnalysis();

  // Discipline message
  const disciplineMsg = dailyPercent >= 80
    ? '🔥 אתה על הדרך. אל תעצור.'
    : dailyPercent >= 50
    ? '⚠️ חצי דרך. אתה יכול יותר.'
    : '💀 אתה נכשל. קום ותתחיל לעבוד.';

  // Diagnostics
  const diagnostics = useMemo(() => [
    { name: 'פירוק שעת התחלה', pass: todayTasks.every(t => /^\d{2}:\d{2}$/.test(t.startTime)) },
    { name: 'פירוק שעת סיום', pass: todayTasks.every(t => /^\d{2}:\d{2}$/.test(t.endTime)) },
    { name: 'בדיקת nowTask', pass: !nowTask || isNowBetween(nowTask.startTime, nowTask.endTime) },
    { name: 'בדיקת nextTask', pass: !nextTask || timeToMinutes(nextTask.startTime) > nowMin },
    { name: 'בדיקת הישגים', pass: unlockedAchievements.length === ACHIEVEMENTS.length },
    { name: 'בדיקת ציר זמן חי', pass: timeline.length === todayTasks.length },
  ], [todayTasks, nowTask, nextTask, timeline, unlockedAchievements, nowMin]);

  const timerTask = timerTaskId ? tasks.find(t => t.id === timerTaskId) : null;

  return (
    <div className="space-y-6">
      {/* 1. War Mode */}
      <div className="glass-card p-5 glow-red">
        <h3 className="text-lg font-bold text-primary mb-3">🔥 מצב מלחמה</h3>
        {nowTask ? (
          <div className="space-y-2">
            <p className="font-bold text-xl">{nowTask.name}</p>
            <p className="text-muted-foreground">{nowTask.startTime}–{nowTask.endTime}</p>
            <Button
              className="bg-success hover:bg-success/90"
              onClick={() => toggleCompletion(nowTask.id, todayStr)}
            >
              <Check className="w-4 h-4 ml-2" /> ✔ סיימתי
            </Button>
          </div>
        ) : nextTask ? (
          <div>
            <p className="text-muted-foreground">אין משימה עכשיו. הבא:</p>
            <p className="font-bold text-lg mt-1">{nextTask.name} — {nextTask.startTime}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">אין עוד משימות להיום</p>
        )}
      </div>

      {/* 2. No Excuses */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-bold mb-2">💪 אין תירוצים</h3>
        <p className="text-foreground font-semibold">{disciplineMsg}</p>
        <p className="text-sm text-muted-foreground mt-2">יעד יומי חובה: 80%</p>
        <div className={`text-sm font-bold mt-1 ${dailyPercent >= 80 ? 'text-success' : 'text-destructive'}`}>
          {dailyPercent >= 80 ? '✅ הושג!' : `❌ עדיין נכשל (${dailyPercent}%)`}
        </div>
      </div>

      {/* 3-6. Points, Streak, Score, Level */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-accent">{stats.points}</div>
          <div className="text-xs text-muted-foreground">נקודות</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats.streak}</div>
          <div className="text-xs text-muted-foreground">סטריק</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-success">{dailyPercent}%</div>
          <div className="text-xs text-muted-foreground">ציון יומי</div>
        </div>
        <div className="glass-card p-4 text-center glow-gold">
          <div className="text-2xl font-bold text-accent">{currentLevel.name}</div>
          <div className="text-xs text-muted-foreground">Level {levelIndex + 1}</div>
          {nextLevel && <div className="text-[10px] text-muted-foreground">הבא: {nextLevel.minPoints} נק׳</div>}
        </div>
      </div>

      {/* 7. Live Timeline */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-bold mb-3">⏱ ציר זמן חי</h3>
        <div className="space-y-2">
          {timeline.map(t => (
            <div key={t.id} className="flex items-center gap-3 bg-secondary/30 rounded-lg p-3">
              <span className="text-lg">{t.status}</span>
              <div className="flex-1">
                <span className="font-semibold text-sm">{t.name}</span>
                <span className="text-xs text-muted-foreground mr-2">{t.startTime}–{t.endTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Timer */}
      <div className="glass-card p-5 text-center">
        <h3 className="text-lg font-bold mb-3">⏱ טיימר</h3>
        {timerTask && <p className="text-sm text-accent mb-2">{timerTask.name}</p>}
        <div className="text-4xl font-mono font-bold text-foreground mb-4">{formatTimer(timerSeconds)}</div>
        <div className="flex justify-center gap-3">
          {!timerRunning ? (
            <Button onClick={startTimer} className="gap-2"><Play className="w-4 h-4" /> התחל</Button>
          ) : (
            <Button variant="destructive" onClick={stopTimer} className="gap-2"><Square className="w-4 h-4" /> עצור</Button>
          )}
        </div>
      </div>

      {/* 9. Achievements */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-bold mb-3">🏆 הישגים</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {unlockedAchievements.map(a => (
            <div key={a.id} className={`rounded-lg p-3 text-sm ${a.unlocked ? 'bg-accent/20 border border-accent/30' : 'bg-secondary/30'}`}>
              {a.unlocked ? '🏆' : '🔒'} {a.name}
            </div>
          ))}
        </div>
      </div>

      {/* 10. Failure Analysis */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-bold mb-3">📉 ניתוח כישלונות</h3>
        {failureAnalysis.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין פספוסים! 🎉</p>
        ) : (
          <div className="space-y-2">
            {failureAnalysis.map(f => (
              <div key={f.name} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                <span className="text-sm font-semibold">{f.name}</span>
                <div className="text-sm">
                  <span className="text-destructive">{f.misses} פספוסים</span>
                  <span className="text-muted-foreground mr-2">({f.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 11. Category Performance */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-bold mb-3">📊 ביצועים לפי קטגוריה</h3>
        <div className="space-y-3">
          {categoryStats.map(cs => (
            <div key={cs.category}>
              <div className="flex justify-between text-sm mb-1">
                <span>{cs.category}</span>
                <span className="text-muted-foreground">{cs.percent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-accent" style={{ width: `${cs.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 12. Diagnostics */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-bold mb-3">🔧 בדיקות תקינות</h3>
        <div className="space-y-1">
          {diagnostics.map(d => (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <span>{d.pass ? '🟢 PASS' : '🔴 FAIL'}</span>
              <span className="text-muted-foreground">{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sound toggle */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-bold mb-3">⚙️ הגדרות</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">אפקטי סאונד</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const newVal = !isSoundEnabled();
              setSoundEnabled(newVal);
              // Force re-render
              setTimerTaskId(timerTaskId);
            }}
          >
            {isSoundEnabled() ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {isSoundEnabled() ? 'מופעל' : 'מושבת'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTab;
