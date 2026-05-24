import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock, Share2, Trash2, Flame, Crown, Shield, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTaskContext } from '@/context/TaskContext';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Portrait {
  id: string;
  portrait_date: string;
  image_url: string;
  level: number;
  streak: number;
  rarity: string;
  stats: any;
  created_at: string;
}

const RARITY_STYLE: Record<string, { label: string; ring: string; bg: string; text: string; icon: any }> = {
  common:    { label: 'רגיל',  ring: 'ring-muted-foreground/40',       bg: 'from-muted/20 to-transparent',                    text: 'text-muted-foreground', icon: Shield },
  rare:      { label: 'נדיר',  ring: 'ring-blue-400/60',               bg: 'from-blue-500/20 to-cyan-500/10',                 text: 'text-blue-300',         icon: Swords },
  epic:      { label: 'אפי',   ring: 'ring-purple-400/70',             bg: 'from-purple-500/30 to-pink-500/10',               text: 'text-purple-300',       icon: Sparkles },
  legendary: { label: 'אגדי',  ring: 'ring-amber-400/80 shadow-[0_0_30px_hsl(45_100%_50%/0.4)]', bg: 'from-amber-500/30 to-orange-500/10', text: 'text-amber-300', icon: Crown },
  mythic:    { label: 'מיתי',  ring: 'ring-rose-400 shadow-[0_0_50px_hsl(0_90%_60%/0.6)] animate-pulse', bg: 'from-rose-600/40 via-purple-600/20 to-amber-500/20', text: 'text-rose-300', icon: Flame },
};

export default function WarriorGallery() {
  const { user } = useAuth();
  const { stats, getTodayTasks, getDailyCompletionPercent } = useTaskContext();
  const [portraits, setPortraits] = useState<Portrait[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Portrait | null>(null);
  const [toDelete, setToDelete] = useState<Portrait | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todayPortrait = portraits.find(p => p.portrait_date === today);

  const todayTasks = getTodayTasks();
  const todayPct = Math.round(getDailyCompletionPercent(new Date()));
  const completedToday = todayTasks.filter(t => t.completions[today]).length;
  const canUnlock = todayPct >= 80;
  const level = Math.floor(stats.points / 100) + 1;

  useEffect(() => {
    if (!user) return;
    loadPortraits();
  }, [user]);

  const loadPortraits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('warrior_portraits')
      .select('*')
      .order('portrait_date', { ascending: false });
    if (error) console.error(error);
    setPortraits((data || []) as Portrait[]);
    setLoading(false);
  };

  const generateToday = async () => {
    if (!canUnlock) {
      toast.error('סיים לפחות 80% מהמשימות היום כדי לפתוח את הדיוקן');
      return;
    }
    if (todayPortrait) {
      setSelected(todayPortrait);
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-warrior-portrait', {
        body: {
          streak: stats.streak,
          level,
          completedToday,
          totalToday: todayTasks.length,
          completionPercent: todayPct,
          displayName: user?.user_metadata?.display_name || 'Warrior',
        },
      });
      if (error) throw error;
      if (data?.portrait) {
        toast.success(`🔥 דיוקן ${RARITY_STYLE[data.portrait.rarity]?.label || ''} נפתח!`);
        await loadPortraits();
        setSelected(data.portrait);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'יצירת הדיוקן נכשלה');
    } finally {
      setGenerating(false);
    }
  };

  const sharePortrait = async (p: Portrait) => {
    try {
      const resp = await fetch(p.image_url);
      const blob = await resp.blob();
      const file = new File([blob], `warrior-${p.portrait_date}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'הלוחם שלי היום',
          text: `סטריק של ${p.streak} ימים. רמה ${p.level}. דרגה: ${RARITY_STYLE[p.rarity]?.label}`,
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(p.image_url);
        toast.success('הקישור הועתק');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deletePortrait = async (p: Portrait) => {
    const { error } = await supabase.from('warrior_portraits').delete().eq('id', p.id);
    if (error) {
      toast.error('המחיקה נכשלה');
      return;
    }
    toast.success('הדיוקן נמחק');
    setToDelete(null);
    if (selected?.id === p.id) setSelected(null);
    await loadPortraits();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-l from-amber-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
          גלריית הלוחם
        </h2>
        <p className="text-sm text-muted-foreground">בכל יום שתסיים את המשימות — ה-AI יוצר דיוקן ייחודי שלך</p>
      </div>

      {/* Today's card */}
      <Card className={`relative overflow-hidden p-5 bg-gradient-to-br ${todayPortrait ? RARITY_STYLE[todayPortrait.rarity]?.bg : 'from-card to-background'} border-2 ${todayPortrait ? `ring-2 ${RARITY_STYLE[todayPortrait.rarity]?.ring}` : 'border-dashed border-border'}`}>
        <div className="flex gap-4 items-center">
          <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center">
            {todayPortrait ? (
              <img src={todayPortrait.image_url} alt="הלוחם של היום" className="w-full h-full object-cover cursor-pointer" onClick={() => setSelected(todayPortrait)} />
            ) : canUnlock ? (
              <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
            ) : (
              <Lock className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">הלוחם של היום</div>
            {todayPortrait ? (
              <>
                <div className="font-bold text-lg">דיוקן {RARITY_STYLE[todayPortrait.rarity]?.label}</div>
                <div className="text-xs text-muted-foreground">סטריק {todayPortrait.streak} · רמה {todayPortrait.level}</div>
              </>
            ) : canUnlock ? (
              <>
                <div className="font-bold text-lg">מוכן להיפתח</div>
                <div className="text-xs text-muted-foreground">{completedToday}/{todayTasks.length} משימות · סטריק {stats.streak}</div>
              </>
            ) : (
              <>
                <div className="font-bold text-lg">נעול</div>
                <div className="text-xs text-muted-foreground">סיים 80% מהיום ({completedToday}/{todayTasks.length}) כדי לפתוח</div>
                <div className="mt-2 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-l from-amber-400 to-rose-400 transition-all" style={{ width: `${todayPct}%` }} />
                </div>
              </>
            )}
          </div>
        </div>
        <Button
          onClick={generateToday}
          disabled={generating || (!canUnlock && !todayPortrait)}
          className="w-full mt-4 bg-gradient-to-l from-amber-500 via-rose-500 to-purple-600 text-white font-bold hover:opacity-90"
        >
          {generating ? '🎨 יוצר את הלוחם שלך...' :
           todayPortrait ? 'הצג את הדיוקן' :
           canUnlock ? '✨ פתח את הדיוקן של היום' : '🔒 נעול'}
        </Button>
      </Card>

      {/* Collection grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm text-muted-foreground">האוסף שלך · {portraits.length}</h3>
        </div>
        {loading ? (
          <div className="text-center text-muted-foreground py-8 text-sm">טוען...</div>
        ) : portraits.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            עוד אין דיוקנים. פתח את הראשון היום!
          </Card>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {portraits.map(p => {
              const r = RARITY_STYLE[p.rarity] || RARITY_STYLE.common;
              const Icon = r.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`relative aspect-square rounded-lg overflow-hidden ring-2 ${r.ring} bg-gradient-to-br ${r.bg} hover:scale-105 transition-transform`}
                >
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm rounded-full p-1">
                    <Icon className={`w-3 h-3 ${r.text}`} />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 text-right">
                    <div className="text-[10px] font-bold text-white">{new Date(p.portrait_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="max-w-md w-full" onClick={e => e.stopPropagation()}>
            <Card className={`p-3 bg-gradient-to-br ${RARITY_STYLE[selected.rarity]?.bg} ring-4 ${RARITY_STYLE[selected.rarity]?.ring}`}>
              <img src={selected.image_url} alt="" className="w-full rounded-lg" />
              <div className="mt-3 space-y-1 text-center">
                <div className={`text-lg font-black ${RARITY_STYLE[selected.rarity]?.text}`}>
                  דיוקן {RARITY_STYLE[selected.rarity]?.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(selected.portrait_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="flex justify-center gap-4 text-sm pt-1">
                  <span className="text-amber-300">🔥 {selected.streak} ימים</span>
                  <span className="text-blue-300">⚔️ רמה {selected.level}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" className="flex-1 gap-1" onClick={() => sharePortrait(selected)}>
                  <Share2 className="w-4 h-4" /> שתף
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setToDelete(selected)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>סגור</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={() => setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את הדיוקן?</AlertDialogTitle>
            <AlertDialogDescription>הפעולה אינה הפיכה. תאבד את הדיוקן הזה לתמיד.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && deletePortrait(toDelete)} className="bg-destructive text-destructive-foreground">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
