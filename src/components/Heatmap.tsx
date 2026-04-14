import { useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, formatDate } from '@/lib/dateUtils';

const Heatmap = () => {
  const { getDailyCompletionPercent } = useTaskContext();

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

  const getColor = (pct: number) => {
    if (pct === 0) return 'bg-secondary/40';
    if (pct < 30) return 'bg-destructive/30';
    if (pct < 60) return 'bg-accent/40';
    if (pct < 80) return 'bg-accent/70';
    return 'bg-success/80';
  };

  const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
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
        <div className="w-3 h-3 rounded-sm bg-success/80" />
        <span>יותר</span>
      </div>
    </div>
  );
};

export default Heatmap;
