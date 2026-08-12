import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Flame, Star, Medal, Crown, TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
}

const STORAGE_KEY = 'leaderboard_prev_ranks';

const getRankIcon = (index: number) => {
  if (index === 0) return <Crown className="w-5 h-5 text-yellow-400 animate-pulse" />;
  if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
  if (index === 2) return <Medal className="w-5 h-5 text-primary" />;
  return null;
};

const ConfettiCanvas = ({ active }: { active: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#B6DD0E', '#06b6d4', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; rotation: number; rv: number; life: number;
    }> = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * 360,
        rv: (Math.random() - 0.5) * 10,
        life: 1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.rotation += p.rv;
        p.life -= 0.012;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (alive) animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const Leaderboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<'xp' | 'streak' | 'tasks'>('xp');
  const [timeFilter, setTimeFilter] = useState<'all' | 'friends'>('all');
  const [loading, setLoading] = useState(true);
  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatedRows, setAnimatedRows] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrevRanks(JSON.parse(stored));
    } catch {}
  }, []);

  // Load friends
  useEffect(() => {
    if (!user) return;
    const loadFriends = async () => {
      const { data } = await supabase
        .from('friendships')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (data) {
        const ids = data.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id);
        setFriendIds(ids);
      }
    };
    loadFriends();
  }, [user]);

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

  let filtered = entries;
  if (timeFilter === 'friends' && user) {
    const friendSet = new Set([...friendIds, user.id]);
    filtered = entries.filter(e => friendSet.has(e.user_id));
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'xp') return b.xp - a.xp;
    if (sortBy === 'streak') return b.current_streak - a.current_streak;
    return b.total_tasks_completed - a.total_tasks_completed;
  });

  const myRank = sorted.findIndex(e => e.user_id === user?.id) + 1;

  const saveRanks = useCallback(() => {
    const newRanks: Record<string, number> = {};
    sorted.forEach((e, i) => { newRanks[e.user_id] = i + 1; });

    if (user?.id && prevRanks[user.id] && newRanks[user.id] < prevRanks[user.id]) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRanks));
  }, [sorted, prevRanks, user?.id]);

  useEffect(() => {
    if (sorted.length > 0) saveRanks();
  }, [sorted.length, sortBy, timeFilter]);

  useEffect(() => {
    if (sorted.length === 0) return;
    sorted.slice(0, 20).forEach((entry, i) => {
      setTimeout(() => {
        setAnimatedRows(prev => new Set([...prev, entry.user_id]));
      }, i * 80);
    });
  }, [sorted.length, sortBy, timeFilter]);

  const getRankChange = (userId: string, currentRank: number) => {
    const prev = prevRanks[userId];
    if (!prev) return null;
    const diff = prev - currentRank;
    if (diff > 0) return { direction: 'up' as const, amount: diff };
    if (diff < 0) return { direction: 'down' as const, amount: Math.abs(diff) };
    return null;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
      <ConfettiCanvas active={showConfetti} />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          לוח מובילים
        </CardTitle>

        {/* Time filter */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => { setTimeFilter('all'); setAnimatedRows(new Set()); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              timeFilter === 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3 h-3" />
            גלובלי
          </button>
          <button
            onClick={() => { setTimeFilter('friends'); setAnimatedRows(new Set()); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              timeFilter === 'friends' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-3 h-3" />
            חברים
          </button>
        </div>

        {/* Sort filter */}
        <div className="flex gap-2 mt-2">
          {[
            { key: 'xp' as const, label: 'XP', icon: Star },
            { key: 'streak' as const, label: 'סטריק', icon: Flame },
            { key: 'tasks' as const, label: 'משימות', icon: Trophy },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setSortBy(tab.key); setAnimatedRows(new Set()); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                sortBy === tab.key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:scale-105'
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
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">טוען דירוגים...</p>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {timeFilter === 'friends' ? 'הוסף חברים כדי לראות את הדירוג שלהם' : 'אין נתונים עדיין'}
          </p>
        ) : (
          <>
            {myRank > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-center animate-fade-in">
                🏆 אתה במקום <span className="font-bold text-primary">#{myRank}</span> מתוך {sorted.length}
              </div>
            )}
            <div className="space-y-2">
              {sorted.slice(0, 20).map((entry, i) => {
                const isMe = entry.user_id === user?.id;
                const isVisible = animatedRows.has(entry.user_id);
                const rankChange = getRankChange(entry.user_id, i + 1);

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
                      isMe
                        ? 'bg-primary/10 border border-primary/30 shadow-md shadow-primary/10'
                        : 'bg-muted/30 hover:bg-muted/50'
                    } ${i < 3 ? 'border border-border/50' : ''}`}
                    style={{
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
                      transition: `opacity 0.4s ease-out, transform 0.4s ease-out`,
                    }}
                  >
                    <div className="w-8 text-center font-bold text-sm relative">
                      {getRankIcon(i) || <span className="text-muted-foreground">#{i + 1}</span>}
                      {i === 0 && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {entry.display_name} {isMe && <span className="text-primary">(אתה)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        רמה {entry.level} • {entry.current_streak}🔥 סטריק
                      </p>
                    </div>

                    {rankChange && (
                      <div className={`flex items-center gap-0.5 text-xs font-medium ${
                        rankChange.direction === 'up' ? 'text-green-400' : 'text-muted-foreground'
                      }`}>
                        {rankChange.direction === 'up'
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {rankChange.amount}
                      </div>
                    )}

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
