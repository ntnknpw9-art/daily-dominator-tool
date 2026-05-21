import { WorkoutDetail, DayOfWeek } from '@/types/task';

export interface ParsedExercise {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  weighted: boolean;
  raw: string;
}

export interface ParsedDay {
  day: DayOfWeek;
  focus: string;
  exercises: ParsedExercise[];
  raw: string;
}

const WEIGHTED_HINTS = [
  'סקוואט', 'דדליפט', 'ברבל', 'דמבל', 'משקולת', 'משקולות', 'לחיצה', 'לחיצת',
  'חתירה', 'מכונה', 'כבל', 'ברזל', 'הולטר', 'גופית', 'יד עליונה', 'יד קדמית', 'יד אחורית',
  'curl', 'press', 'row', 'squat', 'deadlift', 'bench', 'rdl', 'lunge', 'דחיקה', 'קיק'
];

const BODYWEIGHT_HINTS = [
  'שכיבות סמיכה', 'מתח', 'פלאנק', 'בטן', 'crunches', 'pull-up', 'pull up', 'pushup',
  'push up', 'plank', 'burpee', 'בורפי', 'סקוואט גוף', 'קליסטניקס', 'דיפס משקל גוף',
  'jumping', 'דילוגים', 'mountain climb', 'הרים', 'גשר'
];

export const detectWeighted = (name: string): boolean => {
  const lower = name.toLowerCase();
  if (BODYWEIGHT_HINTS.some(h => lower.includes(h.toLowerCase()))) return false;
  if (WEIGHTED_HINTS.some(h => lower.includes(h.toLowerCase()))) return true;
  return false;
};

// Parses tokens like "4x8-12", "4×10", "3X12", "4 ש 10-15", "@RIR2", "@RIR 1"
const parseExercise = (raw: string): ParsedExercise | null => {
  const clean = raw.trim().replace(/\s+/g, ' ');
  if (!clean) return null;

  // RIR
  let rir = 2;
  const rirMatch = clean.match(/@?\s*RIR\s*(\d+)/i) || clean.match(/רי?ר\s*(\d+)/);
  if (rirMatch) rir = parseInt(rirMatch[1]);

  // sets × reps  (supports x, X, ×, *, "על", "ש")
  let sets = 3;
  let repsMin = 8;
  let repsMax = 12;
  const setsMatch = clean.match(/(\d+)\s*[x×X*]\s*(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (setsMatch) {
    sets = parseInt(setsMatch[1]);
    repsMin = parseInt(setsMatch[2]);
    repsMax = setsMatch[3] ? parseInt(setsMatch[3]) : repsMin;
  }

  // name = strip the tokens
  let name = clean
    .replace(/@?\s*RIR\s*\d+/gi, '')
    .replace(/רי?ר\s*\d+/g, '')
    .replace(/\d+\s*[x×X*]\s*\d+(?:\s*[-–]\s*\d+)?/g, '')
    .replace(/[,،]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) return null;

  return {
    name,
    sets: Math.max(1, sets),
    repsMin,
    repsMax,
    rir,
    weighted: detectWeighted(name),
    raw: clean,
  };
};

export const parseWorkoutDay = (wd: WorkoutDetail): ParsedDay => {
  const parts = (wd.description || '').split(/\s*—\s*/);
  const focus = parts.length > 1 ? parts[0].trim() : '';
  const rest = parts.length > 1 ? parts.slice(1).join(' — ') : wd.description;
  const tokens = (rest || '').split(/\s*[,،]\s*/).filter(Boolean);
  const exercises = tokens.map(parseExercise).filter((e): e is ParsedExercise => !!e);
  return { day: wd.day, focus, exercises, raw: wd.description };
};

export const parseAllDays = (details: WorkoutDetail[] | undefined): ParsedDay[] => {
  if (!details) return [];
  return details.map(parseWorkoutDay).filter(d => d.exercises.length > 0);
};
