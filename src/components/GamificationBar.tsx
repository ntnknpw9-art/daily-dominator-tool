import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskContext } from '@/context/TaskContext';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Star, Trophy, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000];

const ACHIEVEMENTS = [
  { id: 'first_task', label: '🎯 משימה ראשונה', desc: 'השלם משימה אחת', check: (s: Stats) => s.total >= 1 },
  { id: 'streak_3', label: '🔥 3 ימים רצופים', desc: 'רצף של 3 ימים', check: (s: Stats) => s.streak >= 3 },
  { id: 'streak_7', label: '🔥 שבוע מושלם', desc: 'רצף של 7 ימים', check: (s: Stats) => s.streak >= 7 },
  { id: 'streak_30', label: '💎 חודש רצוף', desc: 'רצף של 30 ימים', check: (s: Stats) => s.streak >= 30 },
  { id: 'tasks_10', label: '⭐ 10 משימות', desc: 'השלם 10 משימות', check: (s: Stats) => s.total >= 10 },
  { id: 'tasks_50', label: '🌟 50 משימות', desc: 'השלם 50 משימות', check: (s: Stats) => s.total >= 50 },
  { id: 'tasks_100', label: '🏆 100 משימות', desc: 'השלם 100 משימות', check: (s: Stats) => s.total >= 100 },
  { id: 'level_5', label: '⚡ רמה 5', desc: 'הגע לרמה 5', check: (s: Stats) => s.level >= 5 },
  { id: 'level_10', label: '👑 רמה 10', desc: 'הגע לרמה 10', check: (s: Stats) => s.level >= 10 },
];

type Stats = { xp: number; level: number; streak: number; total: number; longest: number };

const GamificationBar = () => {
  const { user } = useAuth();
  const { stats, getTotalCompletions } = useTaskContext();
  const [dbStats, setDbStats] = useState<Stats>({ xp: 0, level: 1, streak: 0, total: 0, longest: 0 });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [newAchievement, setNewAchievement] = useState<string | null>(null);

  const totalCompletions = getTotalCompletions();

  // Calculate stats
  useEffect(() => {
    if (!user) return;

    const xp = totalCompletions * 10 + stats.streak * 5;
    let level = 1;
    for (let i = 1; i < LEVEL_XP.length; i++) {
      if (xp >= LEVEL_XP[i]) level = i + 1;
      else break;
    }

    const newStats: Stats = {
      xp,
      level,
      streak: stats.streak,
      total: totalCompletions,
      longest: Math.max(stats.streak, dbStats.longest),
    };
    setDbStats(newStats);

    // Save to DB
    supabase.from('user_stats').upsert({
      user_id: user.id,
      xp: newStats.xp,
      level: newStats.level,
      current_streak: newStats.streak,
      longest_streak: newStats.longest,
      total_tasks_completed: newStats.total,
    }, { onConflict: 'user_id' }).then();

    // Check achievements
    ACHIEVEMENTS.forEach(a => {
      if (a.check(newStats) && !unlockedAchievements.includes(a.id)) {
        supabase.from('user_achievements').upsert({
          user_id: user.id,
          achievement_id: a.id,
        }, { onConflict: 'user_id,achievement_id' }).then(() => {
          setUnlockedAchievements(prev => [...prev, a.id]);
          setNewAchievement(a.label);
          setTimeout(() => setNewAchievement(null), 3000);
        });
      }
    });
  }, [user, totalCompletions, stats.streak]);

  // Load achievements
  useEffect(() => {
    if (!user) return;
    supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id).then(({ data }) => {
      if (data) setUnlockedAchievements(data.map(a => a.achievement_id));
    });
  }, [user]);

  const currentLevelXp = LEVEL_XP[dbStats.level - 1] || 0;
  const nextLevelXp = LEVEL_XP[dbStats.level] || LEVEL_XP[LEVEL_XP.length - 1];
  const progressPercent = Math.min(100, Math.round(((dbStats.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));

  return (
    <>
      {/* Achievement popup */}
      {newAchievement && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-accent text-accent-foreground px-6 py-3 rounded-full font-bold text-lg shadow-lg">
            הישג חדש! {newAchievement}
          </div>
        </div>
      )}

      <div className="bg-card border border-border/50 rounded-xl p-4">
        {/* Top stats row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 text-accent" />
              <span className="font-bold text-foreground">רמה {dbStats.level}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">{dbStats.xp} XP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-destructive" />
              <span className="font-bold text-destructive">{dbStats.streak} 🔥</span>
            </div>
          </div>
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trophy className="w-4 h-4" />
            {unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </button>
        </div>

        {/* XP Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>רמה {dbStats.level}</span>
            <span>{dbStats.xp - currentLevelXp} / {nextLevelXp - currentLevelXp} XP</span>
            <span>רמה {dbStats.level + 1}</span>
          </div>
        </div>

        {/* Achievements grid */}
        {showAchievements && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {ACHIEVEMENTS.map(a => {
              const unlocked = unlockedAchievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`text-center p-2 rounded-lg border text-xs ${
                    unlocked
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-border/30 bg-muted/30 opacity-50'
                  }`}
                >
                  <div className="text-lg">{a.label.split(' ')[0]}</div>
                  <div className={unlocked ? 'text-foreground' : 'text-muted-foreground'}>{a.desc}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default GamificationBar;
