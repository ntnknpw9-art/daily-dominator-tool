import { Task, Category, DayOfWeek, ALL_DAYS } from '@/types/task';
import { parseWorkoutDetailsFromText, sortWorkoutDetails } from '@/lib/workoutParser';

export type AiAction =
  | { type: 'create_task'; name: string; category: Category; startTime: string; endTime: string; days: DayOfWeek[]; startDate?: string; endDate?: string; meaning?: string; workoutDetails?: { day: DayOfWeek; description: string }[] }
  | { type: 'update_task'; id: string; changes: Partial<Omit<Task, 'id' | 'completions'>> & { startTime?: string; endTime?: string } }
  | { type: 'delete_task'; id: string };

const VALID_CATEGORIES: Category[] = ['כושר', 'לימודים', 'כסף', 'משמעת', 'אישי'];

export const ACTIONS_OPEN = '[ACTIONS]';
export const ACTIONS_CLOSE = '[/ACTIONS]';

const normalizeWorkoutDetails = (value: any, days: DayOfWeek[] = []) => {
  if (typeof value === 'string') return parseWorkoutDetailsFromText(value, days);
  if (!Array.isArray(value)) return undefined;
  const details = value
    .map((wd: any) => ({ day: wd?.day as DayOfWeek, description: String(wd?.description || wd?.text || '').trim() }))
    .filter(wd => ALL_DAYS.includes(wd.day) && wd.description.length > 0);
  return details.length ? sortWorkoutDetails(details) : undefined;
};

export const extractActionsBlock = (text: string): { actions: AiAction[]; cleanText: string } | null => {
  const start = text.indexOf(ACTIONS_OPEN);
  if (start === -1) return null;
  const end = text.indexOf(ACTIONS_CLOSE, start);
  if (end === -1) return null;
  const inner = text.slice(start + ACTIONS_OPEN.length, end).trim();
  let parsed: any;
  try { parsed = JSON.parse(inner); } catch { return null; }
  if (!Array.isArray(parsed)) return null;

  const actions: AiAction[] = [];
  for (const a of parsed) {
    if (!a || typeof a !== 'object') continue;
    if (a.type === 'create_task') {
      if (!a.name || !VALID_CATEGORIES.includes(a.category)) continue;
      if (!Array.isArray(a.days)) continue;
      const days = a.days.filter((d: any) => ALL_DAYS.includes(d));
      if (days.length === 0) continue;
      const workoutDetails = normalizeWorkoutDetails(a.workoutDetails || a.workoutPlan || a.plan, days);
      actions.push({
        type: 'create_task',
        name: String(a.name),
        category: a.category,
        startTime: String(a.startTime || '08:00'),
        endTime: String(a.endTime || '09:00'),
        days,
        startDate: a.startDate,
        endDate: a.endDate,
        meaning: a.meaning,
        workoutDetails,
      });
    } else if (a.type === 'update_task' && a.id && a.changes && typeof a.changes === 'object') {
      const changes = { ...a.changes };
      const changeDays = Array.isArray(changes.days) ? changes.days.filter((d: any) => ALL_DAYS.includes(d)) : [];
      const workoutDetails = normalizeWorkoutDetails(changes.workoutDetails || changes.workoutPlan || changes.plan, changeDays);
      if (workoutDetails) changes.workoutDetails = workoutDetails;
      actions.push({ type: 'update_task', id: String(a.id), changes });
    } else if (a.type === 'delete_task' && a.id) {
      actions.push({ type: 'delete_task', id: String(a.id) });
    }
  }
  if (actions.length === 0) return null;
  const cleanText = (text.slice(0, start) + text.slice(end + ACTIONS_CLOSE.length)).trim();
  return { actions, cleanText };
};

export const summarizeAction = (a: AiAction, tasks: Task[]): string => {
  if (a.type === 'create_task') {
    return `➕ הוסף "${a.name}" (${a.category}) ${a.startTime}-${a.endTime} · ${a.days.join(', ')}`;
  }
  const t = tasks.find(t => t.id === (a as any).id);
  const name = t?.name || '?';
  if (a.type === 'update_task') {
    const fields = Object.keys(a.changes).join(', ');
    return `✏️ עדכן "${name}" (${fields})`;
  }
  return `🗑️ מחק "${name}"`;
};
