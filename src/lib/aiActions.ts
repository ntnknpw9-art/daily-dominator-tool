import { Task, Category, DayOfWeek, ALL_DAYS } from '@/types/task';

export type AiAction =
  | { type: 'create_task'; name: string; category: Category; startTime: string; endTime: string; days: DayOfWeek[]; startDate?: string; endDate?: string; meaning?: string; workoutDetails?: { day: DayOfWeek; description: string }[] }
  | { type: 'update_task'; id: string; changes: Partial<Omit<Task, 'id' | 'completions'>> & { startTime?: string; endTime?: string } }
  | { type: 'delete_task'; id: string };

const VALID_CATEGORIES: Category[] = ['כושר', 'לימודים', 'כסף', 'משמעת', 'אישי'];

export const ACTIONS_OPEN = '[ACTIONS]';
export const ACTIONS_CLOSE = '[/ACTIONS]';

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
        workoutDetails: Array.isArray(a.workoutDetails) ? a.workoutDetails : undefined,
      });
    } else if (a.type === 'update_task' && a.id && a.changes && typeof a.changes === 'object') {
      actions.push({ type: 'update_task', id: String(a.id), changes: a.changes });
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
