import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael } from '@/lib/dateUtils';

const NightSummary = () => {
  const { getDailyCompletionPercent, getTodayTasks, getTotalCompletions, stats } = useTaskContext();
  const now = getNowInIsrael();
  const hour = now.getHours();
  const dailyPercent = getDailyCompletionPercent(now);
  const todayTasks = getTodayTasks();
  const todayStr = now.toISOString().split('T')[0];
  const completedToday = todayTasks.filter(t => t.completions[todayStr]).length;

  // Only show after 20:00
  if (hour < 20) return null;

  return (
    <div className="glass-card p-5 animate-fade-in border-accent/30">
      <div className="text-center">
        <div className="text-3xl mb-2">🌙</div>
        <h3 className="text-lg font-bold mb-1">סיכום יום</h3>
        <p className="text-xs text-muted-foreground mb-4">לפני שאתה הולך לישון...</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-foreground">{completedToday}/{todayTasks.length}</div>
          <div className="text-[10px] text-muted-foreground">משימות</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className={`text-xl font-bold ${dailyPercent >= 80 ? 'text-success' : 'text-muted-foreground'}`}>{dailyPercent}%</div>
          <div className="text-[10px] text-muted-foreground">ביצוע</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-accent">{stats.streak}</div>
          <div className="text-[10px] text-muted-foreground">סטריק</div>
        </div>
      </div>

      <div className={`rounded-lg p-4 text-center text-sm font-bold ${
        dailyPercent >= 80 ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
      }`}>
        {dailyPercent >= 90 ? '🔥 יום מטורף! אתה מפלצת!' :
         dailyPercent >= 80 ? '💪 יום טוב! המשך ככה מחר.' :
         dailyPercent >= 50 ? '⚠️ יום בינוני. מחר תהיה יותר טוב.' :
         '💀 יום כושל. מחר אתה חייב 100%. אין תירוצים.'}
      </div>
    </div>
  );
};

export default NightSummary;
