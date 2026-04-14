import { useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, formatDate, timeToMinutes } from '@/lib/dateUtils';

const Heatmap = () => {
  const { getDailyCompletionPercent, tasks } = useTaskContext();

  const weeks = useMemo(() => {
    const today = getNowInIsrael();
    const data: { date: string; percent: number; day: number }[][] = [];
    let currentWeek: { date: string; percent: number; day: number }[] = [];

    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const entry = {
        date: formatDate(d),
        percent: getDailyCompletionPercent(d),
        day: d.getDay(),
      };
      currentWeek.push(entry);
      if (d.getDay() === 6 || i === 0) {
        data.push(currentWeek);
        currentWeek = [];
      }
    }
    return data;
  }, [getDailyCompletionPercent]);

  // Hourly performance analysis
  const hourlyData = useMemo(() => {
    const hours: { hour: number; total: number; done: number }[] = [];
    for (let h = 5; h <= 23; h++) {
      hours.push({ hour: h, total: 0, done: 0 });
    }

    const now = getNowInIsrael();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

      tasks.forEach(t => {
        const startHour = parseInt(t.startTime.split(':')[0]);
        const hourEntry = hours.find(h => h.hour === startHour);
        if (hourEntry) {
          hourEntry.total++;
          if (t.completions[ds]) hourEntry.done++;
        }
      });
    }

    return hours.filter(h => h.total > 0);
  }, [tasks]);

  const getColor = (pct: number) => {
    if (pct === 0) return 'bg-secondary/40';
    if (pct < 30) return 'bg-destructive/30';
    if (pct < 60) return 'bg-accent/40';
    if (pct < 80) return 'bg-accent/70';
    return 'bg-green-500/80';
  };

  const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <div className="space-y-4">
      {/* Main heatmap */}
      <div className="glass-card p-5 animate-fade-in">
        <h3 className="text-lg font-bold mb-4">🗓️ מפת חום — 12 שבועות</h3>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 ml-2">
            {dayNames.map(d => (
              <div key={d} className="w-4 h-4 text-[9px] text-muted-foreground flex items-center justify-center">{d}</div>
            ))}
          </div>
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, di) => {
                  const entry = week.find(e => e.day === di);
                  if (!entry) return <div key={di} className="w-4 h-4" />;
                  return (
                    <div
                      key={di}
                      className={`w-4 h-4 rounded-sm ${getColor(entry.percent)} transition-all hover:ring-1 hover:ring-foreground/30`}
                      title={`${entry.date}: ${entry.percent}%`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground justify-end">
          <span>פחות</span>
          <div className="w-3 h-3 rounded-sm bg-secondary/40" />
          <div className="w-3 h-3 rounded-sm bg-destructive/30" />
          <div className="w-3 h-3 rounded-sm bg-accent/40" />
          <div className="w-3 h-3 rounded-sm bg-accent/70" />
          <div className="w-3 h-3 rounded-sm bg-green-500/80" />
          <span>יותר</span>
        </div>
      </div>

      {/* Hourly performance */}
      {hourlyData.length > 0 && (
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-lg font-bold mb-4">⏰ שעות חזקות ביום</h3>
          <div className="flex items-end gap-1 h-32">
            {hourlyData.map(h => {
              const pct = h.total > 0 ? Math.round((h.done / h.total) * 100) : 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="text-[8px] text-muted-foreground">{pct > 0 ? `${pct}%` : ''}</div>
                  <div
                    className={`w-full rounded-t transition-all ${
                      pct >= 80 ? 'bg-green-500/70' : pct >= 60 ? 'bg-accent/70' : pct >= 30 ? 'bg-orange-500/70' : 'bg-destructive/50'
                    }`}
                    style={{ height: `${Math.max(4, pct * 0.9)}px` }}
                    title={`${h.hour}:00 — ${pct}% (${h.done}/${h.total})`}
                  />
                  <div className="text-[9px] text-muted-foreground">{h.hour}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              80%+
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent inline-block" />
              60-79%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
              &lt;30%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Heatmap;
