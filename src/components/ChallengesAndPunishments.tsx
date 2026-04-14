import { useState, useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getNowInIsrael, getTodayStr } from '@/lib/dateUtils';
import { Swords, Skull, Trophy, Crown, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const WEEKLY_CHALLENGES = [
  { id: 'perfect5', name: '5 ימים מושלמים', description: '100% ביצוע ב-5 ימים השבוע', target: 5, xpReward: 200 },
  { id: 'streak7', name: '7 ימים רצוף', description: 'סטריק של 7 ימים עם 80%+', target: 7, xpReward: 300 },
  { id: 'early', name: 'בוקר מוקדם', description: 'סיים משימה לפני 10:00 כל יום', target: 5, xpReward: 150 },
  { id: 'noskip', name: 'אפס פספוסים', description: 'אל תפספס אף משימה השבוע', target: 7, xpReward: 500 },
  { id: '7days_discipline', name: '7 ימים משמעת', description: '80%+ כל יום למשך שבוע', target: 7, xpReward: 350 },
  { id: '30days_beast', name: '30 יום חיה 🦁', description: '80%+ כל יום למשך חודש', target: 30, xpReward: 2000 },
];

const BOSS_MISSIONS = [
  { id: 'boss_100pct', name: '💀 בוס: 100% היום', description: 'סיים הכל. בלי חריגים.', target: 100, xpReward: 500 },
  { id: 'boss_perfect_week', name: '👑 בוס: שבוע מלא', description: '100% כל 7 ימים', target: 7, xpReward: 1500 },
  { id: 'boss_early_bird', name: '🦅 בוס: ציפור מוקדמת', description: 'כל המשימות לפני הצהריים למשך 5 ימים', target: 5, xpReward: 800 },
];

const PUNISHMENTS = [
  '50 שכיבות סמיכה לפני השינה',
  '100 סקוואטים מחר בבוקר',
  'ריצה של 2 ק"מ נוספים',
  'לוותר על מסך שעה נוספת',
  '3 דקות מקלחת קרה',
  'לקום 30 דקות מוקדם מחר',
];

interface ChallengeData {
  activeChallenge: string | null;
  startDate: string | null;
  progress: number;
}

const ChallengesAndPunishments = () => {
  const { getDailyCompletionPercent, stats } = useTaskContext();
  const { user } = useAuth();
  const todayStr = getTodayStr();

  const [challengeData, setChallengeData] = useState<ChallengeData>({ activeChallenge: null, startDate: null, progress: 0 });
  const [tab, setTab] = useState<'challenges' | 'boss'>('challenges');

  useState(() => {
    if (!user) return;
    supabase
      .from('challenges')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setChallengeData({ activeChallenge: data.challenge_id, startDate: data.start_date, progress: data.progress || 0 });
        }
      });
  });

  const dailyPercent = getDailyCompletionPercent(getNowInIsrael());

  const todayPunishment = useMemo(() => {
    if (dailyPercent < 80 && dailyPercent > 0) {
      return PUNISHMENTS[new Date().getDay() % PUNISHMENTS.length];
    }
    return null;
  }, [dailyPercent]);

  const startChallenge = async (id: string) => {
    if (!user) return;
    setChallengeData({ activeChallenge: id, startDate: todayStr, progress: 0 });
    await supabase.from('challenges').insert({
      user_id: user.id,
      challenge_id: id,
      start_date: todayStr,
      progress: 0,
    });
    toast({ title: '🔥 אתגר התחיל!' });
  };

  const allChallenges = tab === 'challenges' ? WEEKLY_CHALLENGES : BOSS_MISSIONS;
  const activeChallenge = [...WEEKLY_CHALLENGES, ...BOSS_MISSIONS].find(c => c.id === challengeData.activeChallenge);

  const weeklyScores = useMemo(() => {
    const scores: { weekLabel: string; avg: number }[] = [];
    const today = getNowInIsrael();
    for (let w = 0; w < 8; w++) {
      let total = 0;
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (w * 7) - today.getDay());
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        total += getDailyCompletionPercent(date);
      }
      const avg = Math.round(total / 7);
      const label = w === 0 ? 'השבוע' : w === 1 ? 'שבוע שעבר' : `לפני ${w} שבועות`;
      scores.push({ weekLabel: label, avg });
    }
    return scores.sort((a, b) => b.avg - a.avg);
  }, [getDailyCompletionPercent]);

  return (
    <div className="space-y-4">
      {/* Challenges */}
      <div className="glass-card p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" /> אתגרים
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('challenges')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                tab === 'challenges' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              שבועי
            </button>
            <button
              onClick={() => setTab('boss')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                tab === 'boss' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Skull className="w-3 h-3" /> בוס
            </button>
          </div>
        </div>

        {activeChallenge ? (
          <div className={`rounded-lg p-4 border ${tab === 'boss' ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}>
            <div className="flex items-center gap-2">
              {tab === 'boss' && <Skull className="w-5 h-5 text-destructive" />}
              <div className="font-bold text-foreground">{activeChallenge.name}</div>
            </div>
            <p className="text-sm text-muted-foreground">{activeChallenge.description}</p>
            <div className="mt-3 progress-bar">
              <div className={`progress-fill ${tab === 'boss' ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${(challengeData.progress / activeChallenge.target) * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{challengeData.progress}/{activeChallenge.target}</span>
              <span className="text-accent">🏆 {activeChallenge.xpReward} XP</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allChallenges.map(c => (
              <button key={c.id} onClick={() => startChallenge(c.id)}
                className={`rounded-lg p-3 text-right hover:scale-[1.02] transition-all border ${
                  tab === 'boss'
                    ? 'bg-destructive/5 border-destructive/20 hover:border-destructive/40'
                    : 'bg-secondary/30 border-transparent hover:border-primary/30'
                }`}>
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
                <div className="text-xs text-accent mt-1">🏆 {c.xpReward} XP</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Punishments */}
      <div className="glass-card p-5 animate-fade-in">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Skull className="w-5 h-5 text-destructive" /> מערכת עונשים
        </h3>
        {todayPunishment ? (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 animate-shake">
            <div className="text-destructive font-bold text-sm">⚠️ נכשלת היום (מתחת ל-80%)</div>
            <div className="text-foreground font-semibold mt-2">העונש שלך:</div>
            <div className="text-accent font-bold text-lg mt-1">💀 {todayPunishment}</div>
          </div>
        ) : dailyPercent >= 80 ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
            <div className="text-green-400 font-bold">✅ אין עונש היום — עמדת ביעד!</div>
          </div>
        ) : (
          <div className="bg-secondary/30 rounded-lg p-4 text-center text-muted-foreground text-sm">
            עדיין אין נתונים ליום. תתחיל לעבוד!
          </div>
        )}
      </div>

      {/* Self leaderboard */}
      <div className="glass-card p-5 animate-fade-in">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> אתה נגד עצמך
        </h3>
        <div className="space-y-2">
          {weeklyScores.map((ws, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg p-3 ${i === 0 ? 'bg-accent/15 border border-accent/30' : 'bg-secondary/20'}`}>
              <span className="text-lg font-bold w-8 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="flex-1 text-sm font-medium">{ws.weekLabel}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 progress-bar">
                  <div className={`progress-fill ${ws.avg >= 80 ? 'bg-green-500' : ws.avg >= 50 ? 'bg-accent' : 'bg-destructive'}`} style={{ width: `${ws.avg}%` }} />
                </div>
                <span className="text-sm font-bold w-10 text-left">{ws.avg}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No mercy mode when streak is broken */}
      {stats.streak === 0 && dailyPercent < 50 && (
        <div className="glass-card p-6 border-destructive/50 glow-red animate-shake text-center">
          <div className="text-4xl mb-3">💀</div>
          <h3 className="text-xl font-black text-destructive">מצב אין נסיגה</h3>
          <p className="text-foreground font-bold mt-2">שברת את הסטריק. אתה מתחיל מאפס.</p>
          <p className="text-muted-foreground text-sm mt-1">אין תירוצים. רק תוצאות.</p>
        </div>
      )}
    </div>
  );
};

export default ChallengesAndPunishments;
