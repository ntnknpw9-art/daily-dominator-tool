import { useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { Task, DayOfWeek } from '@/types/task';
import { formatDate, getDatesBetween, getNowInIsrael, getHebrewDayFromDate } from '@/lib/dateUtils';
import { Trash2, Timer, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewTaskDialog from './NewTaskDialog';
import { parseWorkoutDay } from '@/lib/workoutParser';

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
  const [editOpen, setEditOpen] = useState(false);

  const today = getNowInIsrael();
  const endDate = new Date(task.endDate) > today ? today : new Date(task.endDate);
  const allDates = getDatesBetween(task.startDate, formatDate(endDate))
    .filter(dateStr => {
      const d = new Date(dateStr + 'T12:00:00');
      const hebrewDay = getHebrewDayFromDate(d) as DayOfWeek;
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
          <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 text-accent" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
      <NewTaskDialog editTask={task} open={editOpen} onOpenChange={setEditOpen} hideTrigger />

      <p className="text-sm text-muted-foreground">{task.meaning}</p>
      <div className="text-xs text-muted-foreground">
        🕐 {task.startTime}–{task.endTime} | 📅 {task.startDate} → {task.endDate}
      </div>
      <div className="text-xs text-muted-foreground">
        ימים: {task.days.join(', ')}
      </div>

      {task.workoutDetails && (
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-secondary/40 to-card/60 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-accent shadow-[0_0_6px_hsl(var(--accent))]" />
            <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-accent">פירוט אימון</span>
          </div>
          {task.workoutDetails.map(wd => {
            const parsed = parseWorkoutDay(wd);
            return (
              <div key={wd.day} className="rounded-lg border border-border/40 bg-background/40 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/30">
                  <span className="text-sm font-black text-foreground">{wd.day}</span>
                  {parsed.focus && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">
                      {parsed.focus}
                    </span>
                  )}
                </div>
                <ul className="space-y-1">
                  {(parsed.exercises.length ? parsed.exercises.map(ex => `${ex.name} ${ex.sets}×${ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin}-${ex.repsMax}`}`) : [wd.description]).map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-primary/60 shrink-0" />
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
