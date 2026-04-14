import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael } from '@/lib/dateUtils';
import { useMemo, useState } from 'react';

const DashboardTab = () => {
  const { tasks, getTotalCompletions, getPlannedTotal, getDailyCompletionPercent } = useTaskContext();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const activeTasks = tasks.length;
  const totalCompletions = getTotalCompletions();
  const plannedTotal = getPlannedTotal();
  const overallPercent = plannedTotal > 0 ? Math.round((totalCompletions / plannedTotal) * 100) : 0;

  const chartData = useMemo(() => {
    const data: { date: string; dayName: string; percent: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = getNowInIsrael();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' }),
        dayName: d.toLocaleDateString('he-IL', { weekday: 'short', timeZone: 'Asia/Jerusalem' }),
        percent: getDailyCompletionPercent(d),
      });
    }
    return data;
  }, [getDailyCompletionPercent]);

  const stats = [
    { label: 'משימות פעילות', value: activeTasks, icon: '🎯', gradient: 'from-primary/20 to-primary/5' },
    { label: 'סימוני וי', value: totalCompletions, icon: '✅', gradient: 'from-success/20 to-success/5' },
    { label: 'פעולות מתוכננות', value: plannedTotal, icon: '📋', gradient: 'from-accent/20 to-accent/5' },
    { label: 'אחוז עמידה כללי', value: `${overallPercent}%`, icon: '📈', gradient: 'from-primary/20 to-accent/5' },
  ];

  // SVG line chart points
  const chartWidth = 100;
  const chartHeight = 50;
  const maxP = Math.max(...chartData.map(d => d.percent), 1);
  const points = chartData.map((d, i) => ({
    x: (i / (chartData.length - 1)) * chartWidth,
    y: chartHeight - (d.percent / maxP) * (chartHeight - 8) - 4,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  // Y axis labels
  const yLabels = [0, 25, 50, 75, 100].filter(v => v <= Math.max(maxP, 100));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`glass-card p-5 text-center bg-gradient-to-b ${s.gradient} hover:scale-[1.02] transition-transform`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-3xl font-extrabold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">📊 גרף התקדמות</h3>
          <span className="text-xs text-muted-foreground">14 ימים אחרונים</span>
        </div>

        {/* SVG Area Chart */}
        <div className="relative mb-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map(ratio => (
              <line
                key={ratio}
                x1="0" x2={chartWidth}
                y1={chartHeight - ratio * (chartHeight - 8) - 4}
                y2={chartHeight - ratio * (chartHeight - 8) - 4}
                stroke="hsl(0 0% 20%)" strokeWidth="0.3" strokeDasharray="2 2"
              />
            ))}

            {/* Gradient fill */}
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
                <stop offset="100%" stopColor="hsl(0, 72%, 51%)" />
              </linearGradient>
            </defs>

            {/* Area */}
            <path d={areaPath} fill="url(#chartGrad)" />

            {/* Line */}
            <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x} cy={p.y} r={hoveredBar === i ? 1.8 : 1}
                  fill={chartData[i].percent >= 80 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 72%, 51%)'}
                  className="transition-all duration-200"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{ cursor: 'pointer' }}
                />
                {hoveredBar === i && (
                  <circle
                    cx={p.x} cy={p.y} r="3"
                    fill="none"
                    stroke={chartData[i].percent >= 80 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 72%, 51%)'}
                    strokeWidth="0.3"
                    opacity="0.5"
                  />
                )}
              </g>
            ))}
          </svg>

          {/* Hover tooltip */}
          {hoveredBar !== null && (
            <div
              className="absolute top-2 bg-card border border-border rounded-lg px-3 py-1.5 text-xs shadow-lg pointer-events-none z-10"
              style={{ left: `${(hoveredBar / (chartData.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="font-bold text-foreground">{chartData[hoveredBar].percent}%</div>
              <div className="text-muted-foreground">{chartData[hoveredBar].date}</div>
            </div>
          )}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between px-1">
          {chartData.map((d, i) => (
            <div key={i} className="text-center" style={{ width: `${100 / chartData.length}%` }}>
              <div className={`text-[9px] ${hoveredBar === i ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                {d.date}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            80%+ — הושג
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            מתחת ל-80%
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
