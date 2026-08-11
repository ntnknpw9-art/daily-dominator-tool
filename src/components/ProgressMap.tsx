import { useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Map, Flag, Star, Trophy, Flame, CheckCircle2, Lock } from 'lucide-react';
import { getNowInIsrael } from '@/lib/dateUtils';
import { useEffect, useState } from 'react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  type: 'tasks' | 'streak' | 'level' | 'xp';
  reward: string;
}

const MILESTONES: Milestone[] = [
  { id: 'm1', title: 'צעד ראשון', description: 'השלם משימה אחת', icon: '🌱', target: 1, type: 'tasks', reward: '+10 XP' },
  { id: 'm2', title: 'מתחיל', description: 'רצף 3 ימים', icon: '🔥', target: 3, type: 'streak', reward: 'תג מתחיל' },
  { id: 'm3', title: '10 משימות', description: 'השלם 10 משימות', icon: '⭐', target: 10, type: 'tasks', reward: '+50 XP' },
  { id: 'm4', title: 'שבוע מושלם', description: 'רצף 7 ימים', icon: '💪', target: 7, type: 'streak', reward: 'תג שבועי' },
  { id: 'm5', title: 'רמה 3', description: 'הגע לרמה 3', icon: '🎖️', target: 3, type: 'level', reward: 'גלגל מזל כפול' },
  { id: 'm6', title: '50 משימות', description: 'השלם 50 משימות', icon: '🌟', target: 50, type: 'tasks', reward: '+100 XP' },
  { id: 'm7', title: 'שבועיים רצוף', description: 'רצף 14 ימים', icon: '💎', target: 14, type: 'streak', reward: 'אפקט מיוחד' },
  { id: 'm8', title: 'רמה 5', description: 'הגע לרמה 5', icon: '⚡', target: 5, type: 'level', reward: 'כותרת VIP' },
  { id: 'm9', title: '100 משימות', description: 'השלם 100 משימות', icon: '🏆', target: 100, type: 'tasks', reward: '+200 XP' },
  { id: 'm10', title: 'חודש רצוף', description: 'רצף 30 ימים', icon: '👑', target: 30, type: 'streak', reward: 'כתר זהב' },
  { id: 'm11', title: 'רמה 10', description: 'הגע לרמה 10', icon: '🏅', target: 10, type: 'level', reward: 'אלוף!' },
  { id: 'm12', title: '500 משימות', description: 'מכונת משמעת', icon: '🌠', target: 500, type: 'tasks', reward: 'אגדי' },
];

const ProgressMap = () => {
  const { user } = useAuth();
  const { getTotalCompletions, stats } = useTaskContext();
  const [dbStats, setDbStats] = useState({ xp: 0, level: 1, streak: 0, total: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setDbStats({
          xp: data.xp,
          level: data.level,
          streak: data.current_streak,
          total: data.total_tasks_completed,
        });
      }
    });
  }, [user]);

  const totalCompletions = getTotalCompletions();
  const currentStats = {
    tasks: Math.max(totalCompletions, dbStats.total),
    streak: Math.max(stats.streak, dbStats.streak),
    level: dbStats.level,
    xp: dbStats.xp,
  };

  const getMilestoneProgress = (m: Milestone) => {
    const current = currentStats[m.type] || 0;
    return Math.min(1, current / m.target);
  };

  const isMilestoneComplete = (m: Milestone) => getMilestoneProgress(m) >= 1;

  // Find current milestone index
  const currentMilestoneIdx = MILESTONES.findIndex(m => !isMilestoneComplete(m));
  const activeIdx = currentMilestoneIdx === -1 ? MILESTONES.length : currentMilestoneIdx;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Map className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">🗺️ מפת ההתקדמות</h3>
      </div>

      <div className="relative">
        {/* Path line */}
        <div className="absolute right-[19px] top-0 bottom-0 w-0.5 bg-border/30" />

        <div className="space-y-1">
          {MILESTONES.map((milestone, idx) => {
            const complete = isMilestoneComplete(milestone);
            const isActive = idx === activeIdx;
            const progress = getMilestoneProgress(milestone);
            const isLocked = idx > activeIdx;

            return (
              <div key={milestone.id} className="relative flex items-start gap-3 py-2">
                {/* Node */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 transition-all duration-300 ${
                  complete
                    ? 'bg-green-500/20 border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : isActive
                    ? 'bg-primary/20 border-2 border-primary animate-pulse shadow-[0_0_15px_rgba(182,221,14,0.4)]'
                    : 'bg-muted/30 border border-border/50'
                }`}>
                  {complete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-muted-foreground/70" />
                  ) : (
                    <span className={isActive ? 'animate-bounce' : 'opacity-50'}>{milestone.icon}</span>
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-2 ${isLocked ? 'opacity-40' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${complete ? 'text-green-400' : isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {milestone.title}
                    </h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      complete ? 'bg-green-500/20 text-green-400' : 'bg-muted/30 text-muted-foreground'
                    }`}>
                      {milestone.reward}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{milestone.description}</p>

                  {/* Progress bar for active milestone */}
                  {isActive && (
                    <div className="mt-1.5">
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-primary to-primary/60 rounded-full transition-all duration-500"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(progress * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Final destination */}
          <div className="relative flex items-center gap-3 py-2">
            <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center bg-accent/20 border-2 border-accent/50">
              <Flag className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-accent">🏆 אלוף המשמעת</h4>
              <p className="text-[11px] text-muted-foreground">השלם את כל אבני הדרך</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressMap;
