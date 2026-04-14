import { useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, formatDate } from '@/lib/dateUtils';

const ProductiveHours = () => {
  const { tasks } = useTaskContext();

  const hourlyData = useMemo(() => {
    const hours: Record<number, { total: number; done: number }> = {};
    for (let h = 6; h <= 23; h++) hours[h] = { total: 0, done: 0 };

    const today = getNowInIsrael();
    for (const task of tasks) {
      const startH = parseInt(task.startTime.split(':')[0]);
      const endH = parseInt(task.endTime.split(':')[0]);
      
      // Count last 14 days
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        const dayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][d.getDay()];
        
        if (!task.days.includes(dayName as any)) continue;
        if (dateStr < task.startDate || dateStr > task.endDate) continue;

        for (let h = startH; h < endH; h++) {
          if (hours[h]) {
            hours[h].total++;
            if (task.completions[dateStr]) hours[h].done++;
          }
        }
      }
    }

    return Object.entries(hours)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        percent: data.total > 0 ? Math.round((data.done / data.total) * 100) : -1,
      }))
      .filter(h => h.percent >= 0);
  }, [tasks]);

  const bestHour = hourlyData.reduce((best, h) => h.percent > best.percent ? h : best, { hour: 0, percent: 0 });

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h3 className="text-lg font-bold mb-2">⏰ שעות פרודוקטיביות</h3>
      <p className="text-xs text-muted-foreground mb-4">לפי 14 ימים אחרונים</p>

      {bestHour.percent > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-4 text-center">
          <span className="text-sm text-success font-bold">🏆 השעה הכי חזקה: {bestHour.hour}:00 ({bestHour.percent}%)</span>
        </div>
      )}

      <div className="space-y-1.5">
        {hourlyData.map(h => (
          <div key={h.hour} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-left">{h.hour}:00</span>
            <div className="flex-1 progress-bar">
              <div
                className={`progress-fill ${h.percent >= 80 ? 'bg-success' : h.percent >= 50 ? 'bg-accent' : 'bg-destructive/60'}`}
                style={{ width: `${h.percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">{h.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductiveHours;
