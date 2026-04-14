import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskContext } from '@/context/TaskContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, Brain, Target, Zap, Calendar } from 'lucide-react';
import { getNowInIsrael } from '@/lib/dateUtils';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const AdvancedAnalytics = () => {
  const { user } = useAuth();
  const { tasks, getDailyCompletionPercent } = useTaskContext();
  const [dbStats, setDbStats] = useState({ xp: 0, level: 1, streak: 0, total: 0, longest: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setDbStats({
          xp: data.xp, level: data.level,
          streak: data.current_streak, total: data.total_tasks_completed,
          longest: data.longest_streak,
        });
      }
    });
  }, [user]);

  // Last 30 days completion data
  const dailyData = useMemo(() => {
    const now = getNowInIsrael();
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const pct = getDailyCompletionPercent(d);
      data.push({
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        day: DAY_NAMES[d.getDay()],
        completion: pct,
      });
    }
    return data;
  }, [getDailyCompletionPercent]);

  // Weekly averages per day
  const dayAverages = useMemo(() => {
    const now = getNowInIsrael();
    const sums: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) sums[i] = { total: 0, count: 0 };
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const pct = getDailyCompletionPercent(d);
      sums[d.getDay()].total += pct;
      sums[d.getDay()].count++;
    }
    return DAY_NAMES.map((name, idx) => ({
      day: name,
      avg: sums[idx].count > 0 ? Math.round(sums[idx].total / sums[idx].count) : 0,
    }));
  }, [getDailyCompletionPercent]);

  // Category distribution
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    tasks.forEach(t => {
      const completions = Object.values(t.completions).filter(Boolean).length;
      if (completions > 0) {
        cats[t.category] = (cats[t.category] || 0) + completions;
      }
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // Radar chart - multi-dimensional performance
  const radarData = useMemo(() => {
    const now = getNowInIsrael();
    const last7 = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7.push(getDailyCompletionPercent(d));
    }
    const avgLast7 = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
    const perfectDays = last7.filter(p => p === 100).length;

    return [
      { metric: 'עקביות', value: Math.min(100, avgLast7) },
      { metric: 'רצף', value: Math.min(100, dbStats.streak * 10) },
      { metric: 'ימים מושלמים', value: Math.min(100, perfectDays * 14) },
      { metric: 'רמה', value: Math.min(100, dbStats.level * 10) },
      { metric: 'ניסיון', value: Math.min(100, dbStats.xp / 50) },
      { metric: 'מגוון', value: Math.min(100, categoryData.length * 20) },
    ];
  }, [getDailyCompletionPercent, dbStats, categoryData]);

  // AI prediction (simple trend)
  const prediction = useMemo(() => {
    const recent7 = dailyData.slice(-7).map(d => d.completion);
    const prev7 = dailyData.slice(-14, -7).map(d => d.completion);
    const recentAvg = recent7.reduce((a, b) => a + b, 0) / recent7.length;
    const prevAvg = prev7.length > 0 ? prev7.reduce((a, b) => a + b, 0) / prev7.length : recentAvg;
    const trend = recentAvg - prevAvg;
    const projected = Math.min(100, Math.max(0, Math.round(recentAvg + trend)));
    return {
      current: Math.round(recentAvg),
      projected,
      trend: trend > 2 ? 'up' : trend < -2 ? 'down' : 'stable',
      trendLabel: trend > 2 ? '📈 במגמת עלייה!' : trend < -2 ? '📉 במגמת ירידה' : '➡️ יציב',
      streakPrediction: dbStats.streak > 0
        ? `סיכוי ${Math.min(95, 50 + dbStats.streak * 3)}% לשמור על הרצף`
        : 'התחל רצף חדש היום!',
    };
  }, [dailyData, dbStats.streak]);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">📊 דשבורד אנליטיקס מתקדם</h3>
        </div>

        {/* AI Prediction Card */}
        <div className="p-3 rounded-lg bg-gradient-to-l from-primary/10 to-transparent border border-primary/20 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">תחזית AI</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{prediction.current}%</div>
              <div className="text-[10px] text-muted-foreground">ממוצע שבועי</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{prediction.projected}%</div>
              <div className="text-[10px] text-muted-foreground">תחזית שבוע הבא</div>
            </div>
            <div>
              <div className="text-lg">{prediction.trendLabel}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{prediction.streakPrediction}</div>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-accent" />
            פרופיל ביצועים
          </h4>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Radar
                  name="ביצועים"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 30-day trend */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-green-400" />
            מגמת 30 יום
          </h4>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                  interval={4}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'השלמה']}
                />
                <Area
                  type="monotone"
                  dataKey="completion"
                  stroke="hsl(var(--primary))"
                  fill="url(#completionGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day averages */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-400" />
            ממוצע לפי יום
          </h4>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayAverages}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'ממוצע']}
                />
                <Bar
                  dataKey="avg"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
