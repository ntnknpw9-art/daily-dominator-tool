import { useTaskContext } from '@/context/TaskContext';
import { Task, ALL_DAYS, DayOfWeek } from '@/types/task';
import { formatDate, getDatesBetween } from '@/lib/dateUtils';
import { Trash2, Timer, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getCategoryColor = (cat: string) => {
  const map: Record<string, string> = {
    'כושר': 'text-primary',
    'לימודים': 'text-accent',
    'כסף': 'text-success',
    'משמעת': 'text-warning',
    'אישי': 'text-muted-foreground',
  };
  return map[cat] || 'text-muted-foreground';
};

const TaskCard = ({ task }: { task: Task }) => {
  const { toggleCompletion, deleteTask, setTimerTaskId } = useTaskContext();
  
  const today = new Date();
  const endDate = new Date(task.endDate) > today ? today : new Date(task.endDate);
  const allDates = getDatesBetween(task.startDate, formatDate(endDate))
    .filter(dateStr => {
      const d = new Date(dateStr);
      const hebrewDay = ALL_DAYS[d.getDay()] as DayOfWeek;
      return task.days.includes(hebrewDay);
    });

  const completedCount = allDates.filter(d => task.completions[d]).length;
  const percent = allDates.length > 0 ? Math.round((completedCount / allDates.length) * 100) : 0;

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">{task.name}</h3>
          <span className={`text-xs font-semibold ${getCategoryColor(task.category)}`}>{task.category}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTimerTaskId(task.id)}>
            <Timer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{task.meaning}</p>
      <div className="text-xs text-muted-foreground">
        🕐 {task.startTime}–{task.endTime} | 📅 {task.startDate} → {task.endDate}
      </div>
      <div className="text-xs text-muted-foreground">
        ימים: {task.days.join(', ')}
      </div>

      {task.workoutDetails && (
        <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
          <span className="text-xs font-semibold text-accent">פירוט אימון:</span>
          {task.workoutDetails.map(wd => (
            <div key={wd.day} className="text-xs text-muted-foreground">{wd.day} — {wd.description}</div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm font-bold">{percent}%</span>
        <div className="progress-bar flex-1">
          <div className="progress-fill bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {allDates.slice(-30).map(dateStr => (
          <button
            key={dateStr}
            onClick={() => toggleCompletion(task.id, dateStr)}
            className={`w-7 h-7 rounded text-[9px] flex items-center justify-center transition-all ${
              task.completions[dateStr]
                ? 'bg-success text-success-foreground'
                : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
            }`}
          >
            {task.completions[dateStr] ? <Check className="w-3 h-3" /> : new Date(dateStr).getDate()}
          </button>
        ))}
      </div>
    </div>
  );
};

const TasksTab = () => {
  const { tasks } = useTaskContext();

  return (
    <div className="space-y-4">
      {tasks.map(task => <TaskCard key={task.id} task={task} />)}
      {tasks.length === 0 && (
        <div className="text-center text-muted-foreground py-12">אין משימות. צור משימה חדשה!</div>
      )}
    </div>
  );
};

export default TasksTab;
