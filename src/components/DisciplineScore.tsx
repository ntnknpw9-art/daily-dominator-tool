import { useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, formatDate } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DisciplineScore = () => {
  const { getDailyCompletionPercent } = useTaskContext();

  const { todayScore, weekAvg, trend, weekScores } = useMemo(() => {
    const now = getNowInIsrael();
    const todayScore = getDailyCompletionPercent(now);

    const scores: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      scores.push(getDailyCompletionPercent(d));
    }

    const weekAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    const firstHalf = scores.slice(4).reduce((a, b) => a + b, 0) / 3;
    const secondHalf = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const trend = secondHalf - firstHalf;

    return { todayScore, weekAvg, trend, weekScores: scores.reverse() };
  }, [getDailyCompletionPercent]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-accent';
    if (score >= 40) return 'text-orange-400';
    return 'text-destructive';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🏆';
    if (score >= 80) return '🔥';
    if (score >= 60) return '💪';
    if (score >= 40) return '⚡';
    return '😤';
  };

  const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const now = getNowInIsrael();

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>📊 ציון משמעת</span>
          <div className="flex items-center gap-1 text-sm">
            {trend > 5 ? (
              <><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-green-400">עולה</span></>
            ) : trend < -5 ? (
              <><TrendingDown className="w-4 h-4 text-destructive" /><span className="text-destructive">יורד</span></>
            ) : (
              <><Minus className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">יציב</span></>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Big score */}
        <div className="text-center mb-4">
          <div className="text-6xl font-black">
            <span className={getScoreColor(todayScore)}>{todayScore}%</span>
          </div>
          <div className="text-2xl mt-1">{getScoreEmoji(todayScore)}</div>
          <div className="text-sm text-muted-foreground mt-1">ציון היום</div>
        </div>

        {/* Week bar chart */}
        <div className="flex items-end justify-between gap-1 h-20 mb-2">
          {weekScores.map((score, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t transition-all ${
                  score >= 80 ? 'bg-green-500/70' : score >= 60 ? 'bg-accent/70' : score >= 40 ? 'bg-orange-500/70' : 'bg-destructive/70'
                }`}
                style={{ height: `${Math.max(4, score * 0.8)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-1">
          {weekScores.map((_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - 6 + i);
            return (
              <div key={i} className="flex-1 text-center text-xs text-muted-foreground">
                {days[d.getDay()]}
              </div>
            );
          })}
        </div>

        {/* Average */}
        <div className="mt-3 text-center text-sm text-muted-foreground">
          ממוצע שבועי: <span className={`font-bold ${getScoreColor(weekAvg)}`}>{weekAvg}%</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DisciplineScore;
