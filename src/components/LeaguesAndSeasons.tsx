import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Medal, Gem, Shield, Star } from 'lucide-react';

const LEAGUES = [
  { id: 'bronze', name: 'ברונזה', icon: Shield, color: 'text-amber-700', minXp: 0 },
  { id: 'silver', name: 'כסף', icon: Medal, color: 'text-gray-300', minXp: 500 },
  { id: 'gold', name: 'זהב', icon: Star, color: 'text-yellow-400', minXp: 1500 },
  { id: 'platinum', name: 'פלטינה', icon: Gem, color: 'text-blue-300', minXp: 3500 },
  { id: 'diamond', name: 'יהלום', icon: Crown, color: 'text-purple-300', minXp: 7000 },
];

const getCurrentSeason = () => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const daysSinceYear = Math.floor((now.getTime() - yearStart.getTime()) / 86400000);
  return Math.floor(daysSinceYear / 30) + 1;
};

const getSeasonDaysLeft = () => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const daysSinceYear = Math.floor((now.getTime() - yearStart.getTime()) / 86400000);
  const seasonDay = daysSinceYear % 30;
  return 30 - seasonDay;
};

const LeaguesAndSeasons = () => {
  const { user } = useAuth();
  const [seasonData, setSeasonData] = useState<{ league: string; season_xp: number; season_rank: number | null } | null>(null);
  const [allPlayers, setAllPlayers] = useState<{ userId: string; name: string; xp: number; league: string }[]>([]);

  const currentSeason = getCurrentSeason();
  const daysLeft = getSeasonDaysLeft();

  useEffect(() => {
    if (!user) return;

    const loadSeason = async () => {
      // Get or create current season
      let { data } = await supabase
        .from('user_seasons')
        .select('*')
        .eq('user_id', user.id)
        .eq('season_number', currentSeason)
        .single();

      if (!data) {
        // Ask the server to create/sync the season row (RLS forbids client writes)
        await supabase.functions.invoke('sync-stats', {
          body: { season_number: currentSeason },
        }).catch((err) => console.error('sync-stats failed', err));

        const { data: refreshed } = await supabase
          .from('user_seasons')
          .select('*')
          .eq('user_id', user.id)
          .eq('season_number', currentSeason)
          .maybeSingle();
        data = refreshed ?? null;
      }

      setSeasonData(data ? { league: data.league, season_xp: data.season_xp, season_rank: data.season_rank } : null);

      // Load all season players
      const { data: seasons } = await supabase
        .from('user_seasons')
        .select('*')
        .eq('season_number', currentSeason)
        .order('season_xp', { ascending: false });

      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name');
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || 'משתמש']) || []);

      setAllPlayers(
        (seasons || []).map(s => ({
          userId: s.user_id,
          name: profileMap.get(s.user_id) || 'משתמש',
          xp: s.season_xp,
          league: s.league,
        }))
      );
    };

    loadSeason();
  }, [user, currentSeason]);

  const currentLeague = LEAGUES.find(l => l.id === seasonData?.league) || LEAGUES[0];
  const nextLeague = LEAGUES[LEAGUES.indexOf(currentLeague) + 1];
  const LeagueIcon = currentLeague.icon;
  const myRank = allPlayers.findIndex(p => p.userId === user?.id) + 1;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          ליגות ועונות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current season banner */}
        <div className="bg-gradient-to-b from-primary/20 to-transparent rounded-lg p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">עונה #{currentSeason}</div>
          <LeagueIcon className={`w-10 h-10 mx-auto mb-2 ${currentLeague.color}`} />
          <div className={`text-xl font-black ${currentLeague.color}`}>{currentLeague.name}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {seasonData?.season_xp || 0} XP בעונה
            {myRank > 0 && <span className="mr-2">• מקום #{myRank}</span>}
          </div>
          <div className="text-xs text-accent mt-2">⏰ {daysLeft} ימים לסוף העונה</div>
          {nextLeague && (
            <div className="text-xs text-muted-foreground mt-1">
              {nextLeague.minXp - (seasonData?.season_xp || 0)} XP לליגת {nextLeague.name}
            </div>
          )}
        </div>

        {/* League tiers */}
        <div className="flex gap-1">
          {LEAGUES.map(l => {
            const LIcon = l.icon;
            const isCurrent = l.id === seasonData?.league;
            return (
              <div
                key={l.id}
                className={`flex-1 text-center p-2 rounded-lg border transition-all ${
                  isCurrent ? 'border-primary/50 bg-primary/10' : 'border-border/20 opacity-40'
                }`}
              >
                <LIcon className={`w-4 h-4 mx-auto ${l.color}`} />
                <div className="text-[9px] mt-0.5">{l.name}</div>
              </div>
            );
          })}
        </div>

        {/* Season leaderboard */}
        {allPlayers.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-muted-foreground">דירוג עונתי</h4>
            {allPlayers.slice(0, 10).map((p, i) => {
              const isMe = p.userId === user?.id;
              return (
                <div key={p.userId} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                  isMe ? 'bg-primary/10 border border-primary/20' : 'bg-muted/20'
                }`}>
                  <span className="w-6 text-center font-bold text-xs">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="flex-1 text-xs">{p.name} {isMe && '(אתה)'}</span>
                  <span className="text-xs font-bold text-primary">{p.xp} XP</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaguesAndSeasons;
