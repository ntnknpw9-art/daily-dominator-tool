import { useEffect, useRef } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, getTodayStr, timeToMinutes, getHebrewDayFromDate } from '@/lib/dateUtils';
import { DayOfWeek } from '@/types/task';
import { toast } from 'sonner';
import { playWarningSound, playSuccessSound } from '@/lib/sounds';

const SmartNotifications = () => {
  const { getTodayTasks, getDailyCompletionPercent } = useTaskContext();
  const notifiedRef = useRef<Set<string>>(new Set());
  const checkCountRef = useRef(0);

  useEffect(() => {
    const check = () => {
      const now = getNowInIsrael();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const todayStr = getTodayStr();
      const tasks = getTodayTasks();

      tasks.forEach(task => {
        const startMin = timeToMinutes(task.startTime);
        const endMin = timeToMinutes(task.endTime);
        const done = task.completions[todayStr];
        const key = `${task.id}-${todayStr}`;

        // 10 minutes before task
        if (!done && startMin - nowMin <= 10 && startMin - nowMin > 0 && !notifiedRef.current.has(`before-${key}`)) {
          notifiedRef.current.add(`before-${key}`);
          toast(`⏰ עוד ${startMin - nowMin} דקות: ${task.name}`, {
            description: `${task.startTime} - ${task.endTime}`,
            duration: 8000,
          });
        }

        // After miss - task ended and not completed
        if (!done && nowMin > endMin && !notifiedRef.current.has(`miss-${key}`)) {
          notifiedRef.current.add(`miss-${key}`);
          playWarningSound();
          toast.error(`פספסת: ${task.name}`, {
            description: 'לא נורא. עכשיו חוזרים למסלול. 💪',
            duration: 8000,
          });
        }
      });

      // Strong day encouragement (check once at specific times)
      checkCountRef.current++;
      if (checkCountRef.current % 10 === 0) { // Every ~10 minutes
        const pct = getDailyCompletionPercent(now);
        const hour = now.getHours();

        if (pct >= 80 && hour >= 14 && !notifiedRef.current.has(`strong-${todayStr}`)) {
          notifiedRef.current.add(`strong-${todayStr}`);
          playSuccessSound();
          toast.success('יום חזק! תמשיך ככה 🔥', {
            description: `${pct}% השלמה עד עכשיו. אתה במסלול!`,
            duration: 8000,
          });
        }
      }
    };

    check();
    const interval = setInterval(check, 60_000); // Check every minute
    return () => clearInterval(interval);
  }, [getTodayTasks, getDailyCompletionPercent]);

  return null; // No UI - only notifications
};

export default SmartNotifications;
