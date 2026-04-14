import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Flame, Star, Medal, Crown } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
}

const rankIcons = [
  <Crown className="w-5 h-5 text-yellow-400" />,
  <Medal className="w-5 h-5 text-gray-300" />,
  <Medal className="w-5 h-5 text-amber-600" />,
];

const Leaderboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<'xp' | 'streak' | 'tasks'>('xp');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data: stats } = await supabase.from('user_stats').select('*');
      const { data: profiles } = await supabase.from('profiles').select('*');

      if (stats && profiles) {
        const profileMap = new Map(profiles.map(p => [p.user_id, p.display_name || 'משתמש']));
        const combined: LeaderboardEntry[] = stats.map(s => ({
          user_id: s.user_id,
          display_name: profileMap.get(s.user_id) || 'משתמש',
          xp: s.xp,
          level: s.level,
          current_streak: s.current_streak,
          longest_streak: s.longest_streak,
          total_tasks_completed: s.total_tasks_completed,
        }));
        setEntries(combined);
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const sorted = [...entries].sort((a, b) => {
    if (sortBy === 'xp') return b.xp - a.xp;
    if (sortBy === 'streak') return b.current_streak - a.current_streak;
    return b.total_tasks_completed - a.total_tasks_completed;
  });

  const myRank = sorted.findIndex(e => e.user_id === user?.id) + 1;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          לוח מובילים
        </CardTitle>
        <div className="flex gap-2 mt-2">
          {[
            { key: 'xp' as const, label: 'XP', icon: Star },
            { key: 'streak' as const, label: 'סטריק', icon: Flame },
            { key: 'tasks' as const, label: 'משימות', icon: Trophy },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSortBy(tab.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sortBy === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">טוען...</p>
        ) : sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">אין נתונים עדיין</p>
        ) : (
          <>
            {myRank > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-center">
                🏆 אתה במקום <span className="font-bold text-primary">#{myRank}</span> מתוך {sorted.length}
              </div>
            )}
            <div className="space-y-2">
              {sorted.slice(0, 20).map((entry, i) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isMe ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-8 text-center font-bold text-sm">
                      {i < 3 ? rankIcons[i] : <span className="text-muted-foreground">#{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {entry.display_name} {isMe && '(אתה)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        רמה {entry.level} • {entry.current_streak}🔥 סטריק
                      </p>
                    </div>
                    <div className="text-left font-bold text-sm text-primary">
                      {sortBy === 'xp' && `${entry.xp} XP`}
                      {sortBy === 'streak' && `${entry.current_streak} ימים`}
                      {sortBy === 'tasks' && `${entry.total_tasks_completed} משימות`}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
