import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, timeToMinutes, isNowBetween } from '@/lib/dateUtils';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Flame, Zap, Moon, Apple, Target, Timer, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DashboardTab = () => {
  const { user } = useAuth();
  const { tasks, getTotalCompletions, getPlannedTotal, getDailyCompletionPercent, getTodayTasks, stats } = useTaskContext();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  
  const [nutrition, setNutrition] = useState({ calories: 0, target: 0 });
  const [sleepHabit, setSleepHabit] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchDashboardData = async () => {
      const todayStr = getNowInIsrael().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      
      const [logsRes, profileRes, habitRes] = await Promise.all([
        supabase.from('nutrition_logs').select('calories').eq('user_id', user.id).eq('log_date', todayStr),
        supabase.from('nutrition_profiles').select('daily_calories').eq('user_id', user.id).maybeSingle(),
        supabase.from('habits').select('completed').eq('user_id', user.id).eq('habit_date', todayStr).eq('habit_id', 'sleep').maybeSingle(),
      ]);

      const cals = logsRes.data?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
      setNutrition({
        calories: cals,
        target: profileRes.data?.daily_calories || 0
      });
      setSleepHabit(habitRes.data?.completed || false);
    };
    fetchDashboardData();
  }, [user]);

  const activeTasks = tasks.length;
  const totalCompletions = getTotalCompletions();
  
  const todayTasks = getTodayTasks();
  const todayCount = todayTasks.length;
  const smartGoal = Math.max(60, Math.min(100, todayCount <= 3 ? 100 : todayCount <= 6 ? 85 : todayCount <= 9 ? 75 : 70));
  const todayPercent = getDailyCompletionPercent(getNowInIsrael());

  const nowMin = timeToMinutes(getNowInIsrael().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }));
  const nextWorkout = todayTasks
    .filter(t => t.category === 'כושר' && timeToMinutes(t.startTime) > nowMin)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0];

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

  const chartWidth = 100;
  const chartHeight = 50;
  const maxP = Math.max(...chartData.map(d => d.percent), 1);
  const points = chartData.map((d, i) => ({
    x: (i / (chartData.length - 1)) * chartWidth,
    y: chartHeight - (d.percent / maxP) * (chartHeight - 8) - 4,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
  const goalY = chartHeight - (smartGoal / maxP) * (chartHeight - 8) - 4;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* 🚀 Control Room Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Streak */}
        <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Flame className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mb-2 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          <div className="text-3xl sm:text-4xl font-black text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{stats.streak}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground font-bold tracking-widest uppercase mt-1">רצף משמעת</div>
        </div>

        {/* Tasks */}
        <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-2 drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
          <div className="text-3xl sm:text-4xl font-black text-foreground">
            <span className={todayPercent >= smartGoal ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.4)]' : 'text-foreground'}>{todayPercent}%</span>
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground font-bold tracking-widest uppercase mt-1">ביצוע יומי (יעד: {smartGoal}%)</div>
        </div>

        {/* Calories */}
        <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Apple className="w-6 h-6 sm:w-8 sm:h-8 text-accent mb-2 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {nutrition.calories} <span className="text-sm text-muted-foreground font-medium">/ {nutrition.target > 0 ? nutrition.target : '-'}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground font-bold tracking-widest uppercase mt-1">קלוריות</div>
        </div>

        {/* Sleep / Next Workout */}
        <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          {nextWorkout ? (
            <>
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-2 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)] animate-pulse-glow" />
              <div className="text-lg sm:text-xl font-black text-foreground truncate w-full text-center">{nextWorkout.name}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-bold tracking-widest uppercase mt-1">האימון הבא ({nextWorkout.startTime})</div>
            </>
          ) : (
            <>
              <Moon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 mb-2 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
              <div className={`text-xl sm:text-2xl font-black ${sleepHabit ? 'text-green-400' : 'text-muted-foreground'}`}>
                {sleepHabit ? 'הושלם' : 'ממתין'}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-bold tracking-widest uppercase mt-1">יעד שינה</div>
            </>
          )}
        </div>
      </div>

      {/* Progress Chart */}
      <div className="glass-card p-4 sm:p-6 glow-red">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" /> התקדמות 14 יום
          </h3>
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium bg-secondary/50 px-2 py-1 rounded-full">מגמת צמיחה</span>
        </div>

        <div className="relative mb-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48 sm:h-56" preserveAspectRatio="none">
            {[0.25, 0.5, 0.75, 1].map(ratio => (
              <line
                key={ratio}
                x1="0" x2={chartWidth}
                y1={chartHeight - ratio * (chartHeight - 8) - 4}
                y2={chartHeight - ratio * (chartHeight - 8) - 4}
                stroke="hsl(0 0% 20%)" strokeWidth="0.3" strokeDasharray="2 2"
              />
            ))}

            <line x1="0" x2={chartWidth} y1={goalY} y2={goalY}
              stroke="hsl(38 92% 50%)" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.7" />

            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(72, 88%, 46%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(72, 88%, 46%)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
                <stop offset="100%" stopColor="hsl(72, 88%, 46%)" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill="url(#chartGrad)" className="animate-fade-in" style={{ animationDuration: '1s' }} />
            <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" 
                  className="animate-[dash_2s_ease-out_forwards]" strokeDasharray="1000" strokeDashoffset="0" />

            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x} cy={p.y} r={hoveredBar === i ? 2 : 1}
                  fill={chartData[i].percent >= smartGoal ? 'hsl(142, 71%, 45%)' : 'hsl(72, 88%, 46%)'}
                  className="transition-all duration-200"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{ cursor: 'pointer' }}
                />
                {hoveredBar === i && (
                  <circle cx={p.x} cy={p.y} r="3.5" fill="none"
                    stroke={chartData[i].percent >= smartGoal ? 'hsl(142, 71%, 45%)' : 'hsl(72, 88%, 46%)'}
                    strokeWidth="0.5" opacity="0.6" className="animate-ping" />
                )}
              </g>
            ))}
          </svg>

          {hoveredBar !== null && (
            <div
              className="absolute top-0 bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-2xl pointer-events-none z-10 backdrop-blur-xl animate-scale-in"
              style={{ left: `${(hoveredBar / (chartData.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="font-black text-foreground text-sm">{chartData[hoveredBar].percent}%</div>
              <div className="text-muted-foreground">{chartData[hoveredBar].date}</div>
            </div>
          )}
        </div>

        <div className="flex justify-between px-1 mt-2">
          {chartData.map((d, i) => (
            <div key={i} className="text-center" style={{ width: `${100 / chartData.length}%` }}>
              <div className={`text-[8px] sm:text-[9px] ${hoveredBar === i ? 'text-foreground font-bold scale-110 transition-transform' : 'text-muted-foreground'}`}>
                {d.date}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DashboardTab;
