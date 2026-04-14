import { useState, useEffect, useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, formatDate, getTodayStr } from '@/lib/dateUtils';
import { Swords, Skull, Trophy } from 'lucide-react';

interface ChallengeData {
  activeChallenge: string | null;
  startDate: string | null;
  progress: number;
  punishments: string[];
}

const WEEKLY_CHALLENGES = [
  { id: 'perfect5', name: '5 ימים מושלמים', description: '100% ביצוע ב-5 ימים השבוע', target: 5 },
  { id: 'streak7', name: '7 ימים רצוף', description: 'סטריק של 7 ימים עם 80%+', target: 7 },
  { id: 'early', name: 'משימה ראשונה עד 10:00', description: 'סיים את המשימה הראשונה עד 10 בבוקר כל יום', target: 5 },
  { id: 'noskip', name: 'אפס פספוסים', description: 'אל תפספס אף משימה השבוע', target: 7 },
];

const PUNISHMENTS = [
  '50 שכיבות סמיכה לפני השינה',
  '100 סקוואטים מחר בבוקר',
  'ריצה של 2 ק"מ נוספים',
  'לוותר על מסך שעה נוספת',
  '3 דקות מקלחת קרה',
  'לקום 30 דקות מוקדם מחר',
];

const ChallengesAndPunishments = () => {
  const { getDailyCompletionPercent, stats } = useTaskContext();
  const todayStr = getTodayStr();

  const [challengeData, setChallengeData] = useState<ChallengeData>(() => {
    const saved = localStorage.getItem('tracker-challenges');
    return saved ? JSON.parse(saved) : { activeChallenge: null, startDate: null, progress: 0, punishments: [] };
  });

  useEffect(() => {
    localStorage.setItem('tracker-challenges', JSON.stringify(challengeData));
  }, [challengeData]);

  const dailyPercent = getDailyCompletionPercent(getNowInIsrael());

  // Auto punishment when daily < 80%
  const todayPunishment = useMemo(() => {
    if (dailyPercent < 80 && dailyPercent > 0) {
      const idx = new Date().getDay() % PUNISHMENTS.length;
      return PUNISHMENTS[idx];
    }
    return null;
  }, [dailyPercent]);

  const startChallenge = (id: string) => {
    setChallengeData({ activeChallenge: id, startDate: todayStr, progress: 0, punishments: [] });
  };

  const activeChallenge = WEEKLY_CHALLENGES.find(c => c.id === challengeData.activeChallenge);

  // Leaderboard - best weeks
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
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" /> אתגרים שבועיים
        </h3>

        {activeChallenge ? (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <div className="font-bold text-foreground">{activeChallenge.name}</div>
            <p className="text-sm text-muted-foreground">{activeChallenge.description}</p>
            <div className="mt-3 progress-bar">
              <div className="progress-fill bg-primary" style={{ width: `${(challengeData.progress / activeChallenge.target) * 100}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{challengeData.progress}/{activeChallenge.target}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {WEEKLY_CHALLENGES.map(c => (
              <button
                key={c.id}
                onClick={() => startChallenge(c.id)}
                className="bg-secondary/30 rounded-lg p-3 text-right hover:bg-secondary/50 transition-all border border-transparent hover:border-primary/30"
              >
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
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
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
            <div className="text-success font-bold">✅ אין עונש היום — עמדת ביעד!</div>
          </div>
        ) : (
          <div className="bg-secondary/30 rounded-lg p-4 text-center text-muted-foreground text-sm">
            עדיין אין נתונים ליום. תתחיל לעבוד!
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="glass-card p-5 animate-fade-in">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> לוח מנהיגים — אתה נגד עצמך
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
                  <div className={`progress-fill ${ws.avg >= 80 ? 'bg-success' : ws.avg >= 50 ? 'bg-accent' : 'bg-destructive'}`} style={{ width: `${ws.avg}%` }} />
                </div>
                <span className="text-sm font-bold w-10 text-left">{ws.avg}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No Retreat Mode */}
      {stats.streak === 0 && dailyPercent < 50 && (
        <div className="glass-card p-6 border-destructive/50 glow-red animate-shake text-center">
          <div className="text-4xl mb-3">💀</div>
          <h3 className="text-xl font-black text-destructive">מצב אין נסיגה</h3>
          <p className="text-foreground font-bold mt-2">שברת את הסטריק. אתה מתחיל מאפס.</p>
          <p className="text-muted-foreground text-sm mt-1">כל יום בלי 80% הוא צעד אחורה. אין תירוצים.</p>
        </div>
      )}
    </div>
  );
};

export default ChallengesAndPunishments;
