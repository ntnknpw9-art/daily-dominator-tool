import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, getTodayStr, formatFullHebrew, getHebrewDayFromDate } from '@/lib/dateUtils';
import { DayOfWeek } from '@/types/task';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playSuccessSound, playWarningSound, createParticleBurst, vibrate } from '@/lib/sounds';

const TodayTab = () => {
  const { getTodayTasks, toggleCompletion } = useTaskContext();
  const today = getNowInIsrael();
  const todayStr = getTodayStr();
  const todayTasks = getTodayTasks();
  const hebrewDay = getHebrewDayFromDate(today) as DayOfWeek;

  return (
    <div className="space-y-4">
      <div className="text-center text-muted-foreground text-sm">
        {formatFullHebrew(today)}
      </div>

      {todayTasks.length === 0 && (
        <div className="text-center text-muted-foreground py-12">אין משימות להיום 🎉</div>
      )}

      {todayTasks.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(task => {
        const done = task.completions[todayStr];
        const detail = task.workoutDetails?.find(wd => wd.day === hebrewDay);

        return (
          <div key={task.id} className={`glass-card p-5 space-y-2 ${done ? 'border-success/50 glow-green' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{task.name}</h3>
                <span className="text-xs text-accent">{task.category}</span>
              </div>
              <span className="text-sm text-muted-foreground">{task.startTime}–{task.endTime}</span>
            </div>
            <p className="text-sm text-muted-foreground">{task.meaning}</p>
            {detail && <div className="text-sm text-accent bg-secondary/50 rounded px-3 py-1">📋 {detail.description}</div>}
            <Button
              variant={done ? "default" : "outline"}
              className={`w-full ${done ? 'bg-success hover:bg-success/90' : ''}`}
              onClick={(e) => {
                const willComplete = !done;
                toggleCompletion(task.id, todayStr);
                if (willComplete) {
                  playSuccessSound();
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  createParticleBurst(rect.left + rect.width / 2, rect.top);
                } else {
                  playWarningSound();
                  vibrate([50, 30, 50]);
                }
              }}
            >
              {done ? <><Check className="w-4 h-4 ml-2" /> הושלם היום ✓</> : 'סמן כהושלם'}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default TodayTab;
