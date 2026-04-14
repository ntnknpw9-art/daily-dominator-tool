import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskContext } from '@/context/TaskContext';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Star, Trophy, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { playAchievementSound } from '@/lib/sounds';
import AchievementsPanel, { ADVANCED_ACHIEVEMENTS, type AchievementStats } from '@/components/AchievementsPanel';
import { getNowInIsrael } from '@/lib/dateUtils';

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000];

type Stats = { xp: number; level: number; streak: number; total: number; longest: number };

const GamificationBar = () => {
  const { user } = useAuth();
  const { tasks, stats, getTotalCompletions, getDailyCompletionPercent } = useTaskContext();
  const [dbStats, setDbStats] = useState<Stats>({ xp: 0, level: 1, streak: 0, total: 0, longest: 0 });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [newAchievement, setNewAchievement] = useState<string | null>(null);

  const totalCompletions = getTotalCompletions();

  // Compute category-specific counts
  const categoryCounts = useMemo(() => {
    const counts = { fitness: 0, study: 0, money: 0, discipline: 0, categoriesUsed: new Set<string>() };
    tasks.forEach(t => {
      const c = Object.values(t.completions).filter(Boolean).length;
      if (c > 0) counts.categoriesUsed.add(t.category);
      if (t.category === 'כושר') counts.fitness += c;
      else if (t.category === 'לימודים') counts.study += c;
      else if (t.category === 'כסף') counts.money += c;
      else if (t.category === 'משמעת') counts.discipline += c;
    });
    return counts;
  }, [tasks]);

  // Count perfect days (100% completion) over last 90 days
  const perfectDays = useMemo(() => {
    const now = getNowInIsrael();
    let count = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (getDailyCompletionPercent(d) === 100) count++;
    }
    return count;
  }, [getDailyCompletionPercent]);

  const achievementStats: AchievementStats = useMemo(() => ({
    xp: dbStats.xp,
    level: dbStats.level,
    streak: dbStats.streak,
    longestStreak: dbStats.longest,
    total: dbStats.total,
    fitnessCount: categoryCounts.fitness,
    studyCount: categoryCounts.study,
    moneyCount: categoryCounts.money,
    disciplineCount: categoryCounts.discipline,
    perfectDays,
    categoriesCompleted: categoryCounts.categoriesUsed.size,
  }), [dbStats, categoryCounts, perfectDays]);

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

    // Check achievements with new system
    const currentStats: AchievementStats = {
      xp: newStats.xp,
      level: newStats.level,
      streak: newStats.streak,
      longestStreak: newStats.longest,
      total: newStats.total,
      fitnessCount: categoryCounts.fitness,
      studyCount: categoryCounts.study,
      moneyCount: categoryCounts.money,
      disciplineCount: categoryCounts.discipline,
      perfectDays,
      categoriesCompleted: categoryCounts.categoriesUsed.size,
    };

    ADVANCED_ACHIEVEMENTS.forEach(a => {
      if (a.check(currentStats) && !unlockedAchievements.includes(a.id)) {
        supabase.from('user_achievements').upsert({
          user_id: user.id,
          achievement_id: a.id,
        }, { onConflict: 'user_id,achievement_id' }).then(() => {
          setUnlockedAchievements(prev => [...prev, a.id]);
          setNewAchievement(a.name);
          playAchievementSound();
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
          <div className="bg-accent text-accent-foreground px-6 py-3 rounded-full font-bold text-lg shadow-lg animate-scale-in border-2 border-accent/50">
            🏆 הישג חדש! {newAchievement}
          </div>
        </div>
      )}

      <div className="bg-card border border-border/50 rounded-xl p-3 sm:p-4">
        {/* Top stats row */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              <span className="font-bold text-sm sm:text-base text-foreground">רמה {dbStats.level}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">{dbStats.xp} XP</span>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
              <span className="font-bold text-sm sm:text-base text-destructive">{dbStats.streak} 🔥</span>
            </div>
          </div>
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trophy className="w-4 h-4" />
            {unlockedAchievements.length}/{ADVANCED_ACHIEVEMENTS.length}
          </button>
        </div>

        {/* XP Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2.5 sm:h-3" />
          <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
            <span>רמה {dbStats.level}</span>
            <span>{dbStats.xp - currentLevelXp} / {nextLevelXp - currentLevelXp} XP</span>
            <span>רמה {dbStats.level + 1}</span>
          </div>
        </div>

        {/* Advanced Achievements Panel */}
        {showAchievements && (
          <AchievementsPanel unlockedIds={unlockedAchievements} stats={achievementStats} />
        )}
      </div>
    </>
  );
};

export default GamificationBar;
