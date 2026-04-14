import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserPlus, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  friendId: string;
  displayName: string;
  status: string;
  xp: number;
  streak: number;
  incoming: boolean;
}

const FriendsSystem = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFriends = async () => {
    if (!user) return;
    setLoading(true);

    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!friendships) { setLoading(false); return; }

    const friendIds = friendships.map(f =>
      f.sender_id === user.id ? f.receiver_id : f.sender_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', friendIds);

    const { data: stats } = await supabase
      .from('user_stats')
      .select('user_id, xp, current_streak')
      .in('user_id', friendIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || 'משתמש']) || []);
    const statsMap = new Map(stats?.map(s => [s.user_id, { xp: s.xp, streak: s.current_streak }]) || []);

    const mapped: Friend[] = friendships.map(f => {
      const friendId = f.sender_id === user.id ? f.receiver_id : f.sender_id;
      const st = statsMap.get(friendId) || { xp: 0, streak: 0 };
      return {
        id: f.id,
        friendId,
        displayName: profileMap.get(friendId) || 'משתמש',
        status: f.status,
        xp: st.xp,
        streak: st.streak,
        incoming: f.receiver_id === user.id && f.status === 'pending',
      };
    });

    setFriends(mapped);
    setLoading(false);
  };

  useEffect(() => { loadFriends(); }, [user]);

  const addFriend = async () => {
    if (!user || !searchEmail.trim()) return;
    setSearching(true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .neq('user_id', user.id);

    const match = profiles?.find(p =>
      p.display_name?.toLowerCase().includes(searchEmail.toLowerCase())
    );

    if (!match) {
      toast({ title: 'לא נמצא משתמש', description: 'נסה שם תצוגה אחר', variant: 'destructive' });
      setSearching(false);
      return;
    }

    const { error } = await supabase.from('friendships').insert({
      sender_id: user.id,
      receiver_id: match.user_id,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'שגיאה', description: error.code === '23505' ? 'כבר שלחת בקשה' : error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ בקשת חברות נשלחה!' });
      setSearchEmail('');
      loadFriends();
    }
    setSearching(false);
  };

  const acceptFriend = async (id: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    toast({ title: '✅ חברות אושרה!' });
    loadFriends();
  };

  const removeFriend = async (id: string) => {
    await supabase.from('friendships').delete().eq('id', id);
    loadFriends();
  };

  const accepted = friends.filter(f => f.status === 'accepted');
  const pending = friends.filter(f => f.incoming);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          חברים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add friend */}
        <div className="flex gap-2">
          <Input
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
            placeholder="חפש לפי שם תצוגה..."
            className="flex-1 text-sm"
            onKeyDown={e => e.key === 'Enter' && addFriend()}
          />
          <Button size="sm" onClick={addFriend} disabled={searching || !searchEmail.trim()}>
            <UserPlus className="w-4 h-4 ml-1" />
            הוסף
          </Button>
        </div>

        {/* Pending requests */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-accent">בקשות ממתינות ({pending.length})</h4>
            {pending.map(f => (
              <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/10 border border-accent/20">
                <span className="text-sm font-medium">{f.displayName}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400" onClick={() => acceptFriend(f.id)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeFriend(f.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-4">טוען...</p>
        ) : accepted.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">עוד אין חברים. הוסף חברים כדי להתחרות!</p>
        ) : (
          <div className="space-y-2">
            {accepted.sort((a, b) => b.xp - a.xp).map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <span className="text-sm font-bold w-6 text-center text-muted-foreground">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{f.displayName}</p>
                  <p className="text-xs text-muted-foreground">{f.xp} XP • {f.streak}🔥</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeFriend(f.id)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FriendsSystem;
