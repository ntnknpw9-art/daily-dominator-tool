import { useEffect, useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { getNowInIsrael } from '@/lib/dateUtils';
import { Flame, Zap, Trophy } from 'lucide-react';

const getGreeting = (hour: number) => {
  if (hour < 5) return 'לילה טוב';
  if (hour < 12) return 'בוקר טוב';
  if (hour < 17) return 'צהריים טובים';
  if (hour < 21) return 'ערב טוב';
  return 'לילה טוב';
};

const MOTIVATIONAL = [
  'משמעת > מוטיבציה',
  'כל יום שאתה עומד ברצף — הופך אותך לחזק יותר',
  'אין קיצורי דרך. רק רצף.',
  'הגרסה הטובה ביותר שלך מתחילה היום',
  'הצלחה היא תוצאה של הרגלים',
  'כאב היום, גאווה מחר',
];

const HeroStreak = () => {
  const { user } = useAuth();
  const { stats, getDailyCompletionPercent } = useTaskContext();
  const [now] = useState(getNowInIsrael());
  const [quoteIdx] = useState(() => Math.floor(Math.random() * MOTIVATIONAL.length));

  const greeting = getGreeting(now.getHours());
  const name = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'לוחם';
  const streak = stats?.current_streak ?? 0;
  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const todayPct = getDailyCompletionPercent(now);

  // Animated bars for streak visualization
  const bars = Array.from({ length: 7 }, (_, i) => {
    const dayOffset = 6 - i;
    const active = dayOffset < streak;
    const height = 30 + ((i * 13) % 35);
    return { active, height };
  });

  return (
    <div className="relative overflow-hidden rounded-[2rem] premium-card hero-bg p-6 animate-fade-in">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
              {greeting}
            </p>
            <h1 className="text-3xl display-font text-foreground leading-none">
              {name}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30">
            <Trophy className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-black text-accent">רמה {level}</span>
          </div>
        </div>

        {/* Streak hero */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              רצף נוכחי
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl display-font text-gradient-fire leading-none drop-shadow-[0_0_30px_hsl(14_100%_57%/0.5)]">
                {streak}
              </span>
              <div className="flex items-center gap-1 mb-2">
                <Flame className="w-5 h-5 text-primary animate-fire-pulse" />
                <span className="text-sm font-bold text-foreground">ימים</span>
              </div>
            </div>
          </div>

          {/* Streak bars */}
          <div className="flex items-end gap-1 mb-2">
            {bars.map((b, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-500 ${
                  b.active ? 'bg-gradient-to-t from-primary to-accent shadow-[0_0_8px_hsl(14_100%_57%/0.6)]' : 'bg-border'
                }`}
                style={{ height: `${b.height}px` }}
              />
            ))}
          </div>
        </div>

        {/* Bottom strip — stats + quote */}
        <div className="mt-5 pt-4 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-foreground">{xp.toLocaleString()} XP</span>
            </div>
            <div className="text-muted-foreground">
              היום: <span className="font-bold text-foreground">{todayPct}%</span>
            </div>
          </div>
          <p className="text-xs italic text-muted-foreground/80 text-center">
            "{MOTIVATIONAL[quoteIdx]}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroStreak;
