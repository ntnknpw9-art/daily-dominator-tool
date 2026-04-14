import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael } from '@/lib/dateUtils';
import { useMemo, useState } from 'react';

const DashboardTab = () => {
  const { tasks, getTotalCompletions, getPlannedTotal, getDailyCompletionPercent, getTodayTasks } = useTaskContext();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const activeTasks = tasks.length;
  const totalCompletions = getTotalCompletions();
  const plannedTotal = getPlannedTotal();
  const overallPercent = plannedTotal > 0 ? Math.round((totalCompletions / plannedTotal) * 100) : 0;

  // Smart daily goal
  const todayTasks = getTodayTasks();
  const todayCount = todayTasks.length;
  const smartGoal = Math.max(60, Math.min(100, todayCount <= 3 ? 100 : todayCount <= 6 ? 85 : todayCount <= 9 ? 75 : 70));
  const todayPercent = getDailyCompletionPercent(getNowInIsrael());

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
    { label: 'סימוני וי', value: totalCompletions, icon: '✅', gradient: 'from-green-500/20 to-green-500/5' },
    { label: 'יעד חכם היום', value: `${smartGoal}%`, icon: '🧠', gradient: 'from-accent/20 to-accent/5' },
    { label: 'עמידה כללית', value: `${overallPercent}%`, icon: '📈', gradient: 'from-primary/20 to-accent/5' },
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

  // Smart goal line position
  const goalY = chartHeight - (smartGoal / maxP) * (chartHeight - 8) - 4;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Smart Goal Banner */}
      <div className={`glass-card p-3 sm:p-4 text-center ${todayPercent >= smartGoal ? 'border-green-500/50' : 'border-accent/30'}`}>
        <div className="text-xs sm:text-sm text-muted-foreground mb-1">🧠 יעד חכם להיום ({todayCount} משימות)</div>
        <div className="text-2xl sm:text-3xl font-black">
          <span className={todayPercent >= smartGoal ? 'text-green-400' : 'text-foreground'}>{todayPercent}%</span>
          <span className="text-muted-foreground text-base sm:text-lg"> / {smartGoal}%</span>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
          {todayCount <= 3 ? 'יום קל — יעד מלא!' : todayCount <= 6 ? 'עומס בינוני — תעשה לפחות 85%' : 'יום עמוס — 75% זה ניצחון'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`glass-card p-3 sm:p-5 text-center bg-gradient-to-b ${s.gradient} hover:scale-[1.02] transition-transform`}>
            <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{s.icon}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">{s.value}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress Chart */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold">📊 גרף התקדמות</h3>
          <span className="text-[10px] sm:text-xs text-muted-foreground">14 ימים אחרונים</span>
        </div>

        <div className="relative mb-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56" preserveAspectRatio="none">
            {[0.25, 0.5, 0.75, 1].map(ratio => (
              <line
                key={ratio}
                x1="0" x2={chartWidth}
                y1={chartHeight - ratio * (chartHeight - 8) - 4}
                y2={chartHeight - ratio * (chartHeight - 8) - 4}
                stroke="hsl(0 0% 20%)" strokeWidth="0.3" strokeDasharray="2 2"
              />
            ))}

            {/* Smart goal line */}
            <line x1="0" x2={chartWidth} y1={goalY} y2={goalY}
              stroke="hsl(38 92% 50%)" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.7" />

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

            <path d={areaPath} fill="url(#chartGrad)" />
            <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />

            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x} cy={p.y} r={hoveredBar === i ? 1.8 : 1}
                  fill={chartData[i].percent >= smartGoal ? 'hsl(142, 71%, 45%)' : 'hsl(0, 72%, 51%)'}
                  className="transition-all duration-200"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{ cursor: 'pointer' }}
                />
                {hoveredBar === i && (
                  <circle cx={p.x} cy={p.y} r="3" fill="none"
                    stroke={chartData[i].percent >= smartGoal ? 'hsl(142, 71%, 45%)' : 'hsl(0, 72%, 51%)'}
                    strokeWidth="0.3" opacity="0.5" />
                )}
              </g>
            ))}
          </svg>

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

        <div className="flex justify-between px-1">
          {chartData.map((d, i) => (
            <div key={i} className="text-center" style={{ width: `${100 / chartData.length}%` }}>
              <div className={`text-[9px] ${hoveredBar === i ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                {d.date}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            יעד הושג
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            מתחת ליעד
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-accent inline-block" />
            יעד חכם
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
