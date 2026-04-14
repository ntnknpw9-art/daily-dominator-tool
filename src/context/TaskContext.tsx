import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Task, UserStats, Category, DayOfWeek } from '@/types/task';
import { formatDate, getNowInIsrael, getHebrewDayFromDate } from '@/lib/dateUtils';

const defaultTasks: Task[] = [
  {
    id: '1',
    name: 'אימון כוח',
    meaning: 'בניית שרירים וכוח פיזי',
    startTime: '14:00',
    endTime: '16:00',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    category: 'כושר',
    days: ['ראשון', 'שני', 'שלישי', 'חמישי'],
    completions: {},
    workoutDetails: [
      { day: 'ראשון', description: 'Push' },
      { day: 'שני', description: 'Pull' },
      { day: 'שלישי', description: 'רגליים' },
      { day: 'חמישי', description: 'פוקוס אישי + בטן' },
    ],
  },
  {
    id: '2',
    name: 'איגרוף',
    meaning: 'אימון לחימה ועמידות',
    startTime: '16:00',
    endTime: '18:00',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    category: 'כושר',
    days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'],
    completions: {},
  },
  {
    id: '3',
    name: 'ריצה',
    meaning: 'סיבולת לב ריאה',
    startTime: '18:00',
    endTime: '18:30',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    category: 'כושר',
    days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'],
    completions: {},
  },
  {
    id: '4',
    name: 'לימוד תאוריה',
    meaning: 'רישיון נהיגה',
    startTime: '19:00',
    endTime: '20:00',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    category: 'לימודים',
    days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'],
    completions: {},
  },
  {
    id: '5',
    name: 'לימוד ספרות',
    meaning: 'השכלה כללית — שעתיים',
    startTime: '20:00',
    endTime: '22:00',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    category: 'לימודים',
    days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'],
    completions: {},
  },
];

interface TaskContextType {
  tasks: Task[];
  stats: UserStats;
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
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tracker-tasks');
    return saved ? JSON.parse(saved) : defaultTasks;
  });
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('tracker-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'completions'>) => {
    setTasks(prev => [...prev, { ...task, id: crypto.randomUUID(), completions: {} }]);
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleCompletion = useCallback((taskId: string, date: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const completions = { ...t.completions };
      completions[date] = !completions[date];
      return { ...t, completions };
    }));
  }, []);

  const getTasksForDay = useCallback((day: DayOfWeek) => {
    return tasks.filter(t => t.days.includes(day));
  }, [tasks]);

  const getTasksForDate = useCallback((date: Date) => {
    const day = getHebrewDay(date);
    const dateStr = formatDate(date);
    return tasks.filter(t => {
      return t.days.includes(day) && dateStr >= t.startDate && dateStr <= t.endDate;
    });
  }, [tasks]);

  const getTodayTasks = useCallback(() => getTasksForDate(new Date()), [getTasksForDate]);

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
    const today = new Date();
    let total = 0;
    for (const task of tasks) {
      const start = new Date(task.startDate);
      const end = new Date(task.endDate) > today ? today : new Date(task.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (task.days.includes(getHebrewDay(d))) total++;
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
    const d = new Date();
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
      tasks, stats, addTask, deleteTask, toggleCompletion,
      getTasksForDay, getTasksForDate, getTodayTasks,
      getDailyCompletionPercent, getTotalCompletions, getPlannedTotal,
      getCategoryStats, getFailureAnalysis, timerTaskId, setTimerTaskId,
    }}>
      {children}
    </TaskContext.Provider>
  );
};
