import { useTaskContext } from '@/context/TaskContext';
import { formatDate } from '@/lib/dateUtils';
import { useMemo } from 'react';

const DashboardTab = () => {
  const { tasks, getTotalCompletions, getPlannedTotal, getDailyCompletionPercent } = useTaskContext();

  const activeTasks = tasks.length;
  const totalCompletions = getTotalCompletions();
  const plannedTotal = getPlannedTotal();
  const overallPercent = plannedTotal > 0 ? Math.round((totalCompletions / plannedTotal) * 100) : 0;

  const chartData = useMemo(() => {
    const data: { date: string; percent: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
        percent: getDailyCompletionPercent(d),
      });
    }
    return data;
  }, [getDailyCompletionPercent]);

  const maxPercent = Math.max(...chartData.map(d => d.percent), 100);

  const stats = [
    { label: 'משימות פעילות', value: activeTasks, color: 'bg-primary' },
    { label: 'סימוני וי', value: totalCompletions, color: 'bg-success' },
    { label: 'פעולות מתוכננות', value: plannedTotal, color: 'bg-accent' },
    { label: 'אחוז עמידה כללי', value: `${overallPercent}%`, color: 'bg-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 text-center">
            <div className={`w-3 h-3 rounded-full ${s.color} mx-auto mb-3`} />
            <div className="text-3xl font-bold text-foreground">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold mb-4">גרף התקדמות</h3>
        <div className="flex items-end gap-1 h-48">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{d.percent}%</span>
              <div className="w-full flex items-end" style={{ height: '140px' }}>
                <div
                  className="w-full rounded-t bg-primary/80 transition-all duration-300 hover:bg-primary"
                  style={{ height: `${(d.percent / maxPercent) * 100}%`, minHeight: d.percent > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
