import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Task, UserStats, Category, DayOfWeek } from '@/types/task';
import { formatDate, getNowInIsrael, getHebrewDayFromDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface TaskContextType {
  tasks: Task[];
  stats: UserStats;
  loading: boolean;
  addTask: (task: Omit<Task, 'id' | 'completions'>) => void;
  deleteTask: (id: string) => void;
  toggleCompletion: (taskId: string, date: string) => void;
  getTasksForDay: (day: DayOfWeek) => Task[];
  getTasksForDate: (date: Date) => Task[];
  getTodayTasks: () => Task[];
  getDailyCompletionPercent: (date: Date) => number;
  getTotalCompletions: () => number;
  getPlannedTotal: () => number;
  getCategoryStats: () => { category: Category; percent: number }[];
  getFailureAnalysis: () => { name: string; misses: number; percent: number }[];
  timerTaskId: string | null;
  setTimerTaskId: (id: string | null) => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

export const useTaskContext = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be inside TaskProvider');
  return ctx;
};

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);

  // Fetch tasks + completions from Supabase
  useEffect(() => {
    if (!user) { setTasks([]); setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      const { data: dbCompletions } = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', user.id);

      if (dbTasks) {
        const completionMap: Record<string, Record<string, boolean>> = {};
        dbCompletions?.forEach(c => {
          if (!completionMap[c.task_id]) completionMap[c.task_id] = {};
          completionMap[c.task_id][c.completion_date] = c.completed;
        });

        const mappedTasks: Task[] = dbTasks.map(t => ({
          id: t.id,
          name: t.name,
          meaning: t.meaning || '',
          startTime: t.start_time,
          endTime: t.end_time,
          startDate: t.start_date,
          endDate: t.end_date,
          category: t.category as Category,
          days: (t.days || []) as DayOfWeek[],
          completions: completionMap[t.id] || {},
          workoutDetails: t.workout_details as unknown as Task['workoutDetails'],
        }));
        setTasks(mappedTasks);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'completions'>) => {
    if (!user) return;
    const { data } = await supabase.from('tasks').insert({
      user_id: user.id,
      name: task.name,
      meaning: task.meaning,
      start_time: task.startTime,
      end_time: task.endTime,
      start_date: task.startDate,
      end_date: task.endDate,
      category: task.category,
      days: task.days,
      workout_details: task.workoutDetails as any,
    }).select().single();

    if (data) {
      setTasks(prev => [...prev, {
        id: data.id,
        name: data.name,
        meaning: data.meaning || '',
        startTime: data.start_time,
        endTime: data.end_time,
        startDate: data.start_date,
        endDate: data.end_date,
        category: data.category as Category,
        days: (data.days || []) as DayOfWeek[],
        completions: {},
        workoutDetails: data.workout_details as unknown as Task['workoutDetails'],
      }]);
    }
  }, [user]);

  const deleteTask = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [user]);

  const toggleCompletion = useCallback(async (taskId: string, date: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentlyDone = task.completions[date];

    if (currentlyDone) {
      await supabase.from('task_completions')
        .delete()
        .eq('task_id', taskId)
        .eq('completion_date', date);
    } else {
      await supabase.from('task_completions').upsert({
        user_id: user.id,
        task_id: taskId,
        completion_date: date,
        completed: true,
      }, { onConflict: 'task_id,completion_date' });
    }

    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const completions = { ...t.completions };
      if (currentlyDone) {
        delete completions[date];
      } else {
        completions[date] = true;
      }
      return { ...t, completions };
    }));
  }, [user, tasks]);

  const getTasksForDay = useCallback((day: DayOfWeek) => {
    return tasks.filter(t => t.days.includes(day));
  }, [tasks]);

  const getTasksForDate = useCallback((date: Date) => {
    const day = getHebrewDayFromDate(date) as DayOfWeek;
    const dateStr = formatDate(date);
    return tasks.filter(t => t.days.includes(day) && dateStr >= t.startDate && dateStr <= t.endDate);
  }, [tasks]);

  const getTodayTasks = useCallback(() => getTasksForDate(getNowInIsrael()), [getTasksForDate]);

  const getDailyCompletionPercent = useCallback((date: Date) => {
    const dayTasks = getTasksForDate(date);
    if (dayTasks.length === 0) return 0;
    const dateStr = formatDate(date);
    const done = dayTasks.filter(t => t.completions[dateStr]).length;
    return Math.round((done / dayTasks.length) * 100);
  }, [getTasksForDate]);

  const getTotalCompletions = useCallback(() => {
    return tasks.reduce((sum, t) => sum + Object.values(t.completions).filter(Boolean).length, 0);
  }, [tasks]);

  const getPlannedTotal = useCallback(() => {
    const today = getNowInIsrael();
    let total = 0;
    for (const task of tasks) {
      const start = new Date(task.startDate + 'T12:00:00');
      const end = new Date(task.endDate + 'T12:00:00') > today ? today : new Date(task.endDate + 'T12:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (task.days.includes(getHebrewDayFromDate(d) as DayOfWeek)) total++;
      }
    }
    return total;
  }, [tasks]);

  const getCategoryStats = useCallback((): { category: Category; percent: number }[] => {
    const categories: Category[] = ['כושר', 'לימודים', 'כסף', 'משמעת', 'אישי'];
    return categories.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      if (catTasks.length === 0) return { category: cat, percent: 0 };
      const total = catTasks.reduce((s, t) => s + Object.keys(t.completions).length, 0);
      const done = catTasks.reduce((s, t) => s + Object.values(t.completions).filter(Boolean).length, 0);
      return { category: cat, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [tasks]);

  const getFailureAnalysis = useCallback(() => {
    return tasks.map(t => {
      const total = Object.keys(t.completions).length;
      const done = Object.values(t.completions).filter(Boolean).length;
      const misses = total - done;
      return { name: t.name, misses, percent: total > 0 ? Math.round((misses / total) * 100) : 0 };
    }).filter(x => x.misses > 0).sort((a, b) => b.misses - a.misses);
  }, [tasks]);

  const totalCompletions = getTotalCompletions();
  const streak = (() => {
    let s = 0;
    const d = getNowInIsrael();
    while (true) {
      const pct = getDailyCompletionPercent(d);
      if (pct >= 80) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  })();

  const stats: UserStats = {
    points: totalCompletions * 10 + streak * 5,
    streak,
    level: 0,
  };

  return (
    <TaskContext.Provider value={{
      tasks, stats, loading, addTask, deleteTask, toggleCompletion,
      getTasksForDay, getTasksForDate, getTodayTasks,
      getDailyCompletionPercent, getTotalCompletions, getPlannedTotal,
      getCategoryStats, getFailureAnalysis, timerTaskId, setTimerTaskId,
    }}>
      {children}
    </TaskContext.Provider>
  );
};
