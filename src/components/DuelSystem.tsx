import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Swords, Trophy, Crown, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: string;
  winner_id: string | null;
  start_date: string;
  end_date: string;
  challenger_score: number;
  opponent_score: number;
}

interface Friend {
  id: string;
  user_id: string;
  display_name: string;
}

const DuelSystem = () => {
  const { user } = useAuth();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDuels();
      fetchFriends();
    }
  }, [user]);

  const fetchDuels = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('duels')
      .select('*')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (data) setDuels(data as Duel[]);
  };

  const fetchFriends = async () => {
    if (!user) return;
    const { data: friendships } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (friendships) {
      const friendIds = friendships.map(f =>
        f.sender_id === user.id ? f.receiver_id : f.sender_id
      );
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', friendIds);
        if (profiles) {
          setFriends(profiles.map(p => ({
            id: p.user_id,
            user_id: p.user_id,
            display_name: p.display_name || 'משתמש',
          })));
        }
      }
    }
  };

  const challengeFriend = async (friendId: string) => {
    if (!user) return;
    setCreating(true);
    try {
      await supabase.from('duels').insert({
        challenger_id: user.id,
        opponent_id: friendId,
        status: 'pending',
      });
      toast.success('⚔️ אתגר נשלח!');
      fetchDuels();
    } catch (err) {
      toast.error('שגיאה בשליחת אתגר');
    } finally {
      setCreating(false);
    }
  };

  const acceptDuel = async (duelId: string) => {
    await supabase.from('duels').update({ status: 'active' }).eq('id', duelId);
    toast.success('⚔️ הדו-קרב התחיל!');
    fetchDuels();
  };

  const activeDuels = duels.filter(d => d.status === 'active');
  const pendingDuels = duels.filter(d => d.status === 'pending');
  const completedDuels = duels.filter(d => d.status === 'completed');

  const getDuelOpponentName = (duel: Duel) => {
    const opponentId = duel.challenger_id === user?.id ? duel.opponent_id : duel.challenger_id;
    return friends.find(f => f.user_id === opponentId)?.display_name || 'יריב';
  };

  const getMyScore = (duel: Duel) =>
    duel.challenger_id === user?.id ? duel.challenger_score : duel.opponent_score;
  const getOpponentScore = (duel: Duel) =>
    duel.challenger_id === user?.id ? duel.opponent_score : duel.challenger_score;

  return (
    <Card className="glass-card border-border/30">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          ⚔️ דו-קרב בין חברים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active duels */}
        {activeDuels.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">🔥 דו-קרבות פעילים</h4>
            {activeDuels.map(duel => (
              <div key={duel.id} className="bg-muted/20 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center flex-1">
                    <div className="text-2xl font-bold text-primary">{getMyScore(duel)}</div>
                    <div className="text-xs text-muted-foreground">אתה</div>
                  </div>
                  <div className="text-center px-4">
                    <Swords className="w-6 h-6 text-primary mx-auto mb-1" />
                    <div className="text-[10px] text-muted-foreground">VS</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-2xl font-bold text-muted-foreground">{getOpponentScore(duel)}</div>
                    <div className="text-xs text-muted-foreground">{getDuelOpponentName(duel)}</div>
                  </div>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.max(5, (getMyScore(duel) / Math.max(1, getMyScore(duel) + getOpponentScore(duel))) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground text-center mt-1">
                  נגמר ב-{duel.end_date}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending duels */}
        {pendingDuels.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">⏳ ממתינים</h4>
            {pendingDuels.map(duel => (
              <div key={duel.id} className="flex items-center justify-between bg-muted/10 rounded-lg p-3 border border-border/10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{getDuelOpponentName(duel)}</span>
                </div>
                {duel.opponent_id === user?.id ? (
                  <Button size="sm" onClick={() => acceptDuel(duel.id)}>
                    ⚔️ קבל אתגר
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-xs">נשלח</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Challenge a friend */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">🎯 אתגר חבר</h4>
          {friends.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">הוסף חברים כדי לאתגר אותם!</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {friends.map(friend => (
                <Button
                  key={friend.id}
                  variant="outline"
                  size="sm"
                  onClick={() => challengeFriend(friend.user_id)}
                  disabled={creating}
                  className="text-xs"
                >
                  ⚔️ {friend.display_name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Completed duels */}
        {completedDuels.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">🏆 הושלמו</h4>
            {completedDuels.slice(0, 3).map(duel => (
              <div key={duel.id} className="flex items-center justify-between bg-muted/10 rounded-lg p-2 text-xs">
                <span>vs {getDuelOpponentName(duel)}</span>
                <div className="flex items-center gap-1">
                  {duel.winner_id === user?.id ? (
                    <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                      <Crown className="w-3 h-3 ml-1" /> ניצחון
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">הפסד</Badge>
                  )}
                  <span className="text-muted-foreground">{getMyScore(duel)}-{getOpponentScore(duel)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DuelSystem;
