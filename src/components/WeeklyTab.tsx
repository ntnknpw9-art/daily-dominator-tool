import { useTaskContext } from '@/context/TaskContext';
import { ALL_DAYS } from '@/types/task';

const WeeklyTab = () => {
  const { getTasksForDay } = useTaskContext();

  return (
    <div className="space-y-4">
      {ALL_DAYS.map(day => {
        const dayTasks = getTasksForDay(day).sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <div key={day} className="glass-card p-5">
            <h3 className="font-bold text-lg mb-3 text-accent">{day}</h3>
            {dayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין משימות</p>
            ) : (
              <div className="space-y-2">
                {dayTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                    <div>
                      <span className="font-semibold text-sm">{task.name}</span>
                      <span className="text-xs text-muted-foreground mr-2">({task.category})</span>
                      <p className="text-xs text-muted-foreground">{task.meaning}</p>
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{task.startTime}–{task.endTime}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyTab;
