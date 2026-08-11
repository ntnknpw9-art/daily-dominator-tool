import { useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, formatDate } from '@/lib/dateUtils';

const WeeklyReport = () => {
  const { getDailyCompletionPercent, getTodayTasks, tasks } = useTaskContext();

  const report = useMemo(() => {
    const today = getNowInIsrael();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - dayOfWeek);

    const days: { date: string; percent: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push({ date: formatDate(d), percent: getDailyCompletionPercent(d) });
    }

    const avgPercent = Math.round(days.reduce((s, d) => s + d.percent, 0) / days.length);
    const bestDay = days.reduce((best, d) => d.percent > best.percent ? d : best, days[0]);
    const worstDay = days.reduce((worst, d) => d.percent < worst.percent ? d : worst, days[0]);
    const perfectDays = days.filter(d => d.percent === 100).length;

    return { days, avgPercent, bestDay, worstDay, perfectDays };
  }, [getDailyCompletionPercent]);

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h3 className="text-lg font-bold mb-4">📋 דוח שבועי</h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-accent">{report.avgPercent}%</div>
          <div className="text-xs text-muted-foreground">ממוצע שבועי</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-success">{report.perfectDays}</div>
          <div className="text-xs text-muted-foreground">ימים מושלמים</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-sm font-bold text-success">{report.bestDay.date}</div>
          <div className="text-xs text-muted-foreground">יום הכי טוב ({report.bestDay.percent}%)</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-sm font-bold text-muted-foreground">{report.worstDay.date}</div>
          <div className="text-xs text-muted-foreground">יום הכי חלש ({report.worstDay.percent}%)</div>
        </div>
      </div>

      {/* Mini bar chart for the week */}
      <div className="flex items-end gap-2 h-24">
        {report.days.map((d, i) => {
          const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{d.percent}%</span>
              <div className="w-full flex items-end" style={{ height: '60px' }}>
                <div
                  className={`w-full rounded-t transition-all ${d.percent >= 80 ? 'bg-success/70' : d.percent >= 50 ? 'bg-accent/60' : 'bg-muted-foreground/40'}`}
                  style={{ height: `${Math.max(d.percent, 3)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{dayNames[i]}</span>
            </div>
          );
        })}
      </div>

      <div className={`mt-4 p-3 rounded-lg text-center text-sm font-bold ${
        report.avgPercent >= 80 ? 'bg-success/15 text-success' : report.avgPercent >= 50 ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'
      }`}>
        {report.avgPercent >= 80 ? '🏆 שבוע מעולה! המשך ככה!' : report.avgPercent >= 50 ? '⚠️ שבוע בינוני. אתה יכול יותר.' : '💀 שבוע חלש. תתעורר!'}
      </div>
    </div>
  );
};

export default WeeklyReport;
