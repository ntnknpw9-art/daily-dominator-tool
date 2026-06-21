import { WorkoutDetail, DayOfWeek, ALL_DAYS } from '@/types/task';

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
  'סקוואט', 'דדליפט', 'דדליפ', 'ברבל', 'דמבל', 'דאמבל', 'משקולת', 'משקולות',
  'לחיצה', 'לחיצת', 'חתירה', 'מכונה', 'כבל', 'קבל', 'ברזל', 'הולטר', 'מוט',
  'יד עליונה', 'יד קדמית', 'יד אחורית', 'פושדאון', 'פולי', 'הרחקת', 'הרחקות',
  'כפיפת', 'כפיפה', 'דחיקה', 'דחיקת', 'קיק', 'פטישים', 'rdl', 'curl', 'press',
  'row', 'squat', 'deadlift', 'bench', 'lunge', 'hammer'
];

const BODYWEIGHT_HINTS = [
  'שכיבות סמיכה', 'שכיבות', 'מתח', 'פלאנק', 'בטן', 'crunches', 'pull-up', 'pull up',
  'pushup', 'push up', 'plank', 'burpee', 'בורפי', 'משקל גוף', 'קליסטניקס', 'דיפס',
  'jumping', 'דילוגים', 'mountain climb', 'גשר', 'עליות מתח', 'עליות', 'פיסטול'
];

export const detectWeighted = (name: string): boolean => {
  const lower = name.toLowerCase();
  if (BODYWEIGHT_HINTS.some(h => lower.includes(h.toLowerCase()))) return false;
  if (WEIGHTED_HINTS.some(h => lower.includes(h.toLowerCase()))) return true;
  return false;
};

// Match a sets×reps token: "4x8-10", "4×10", "3X12", "4*10", "3x12-15"
const SETS_REPS_RE = /(\d+)\s*[x×X*]\s*(\d+)(?:\s*[-–—]\s*(\d+))?/;
const SETS_REPS_GLOBAL_RE = /(\d+)\s*[x×X*]\s*(\d+)(?:\s*[-–—]\s*(\d+))?/g;
const DAY_RE = /(?:^|[\n\r,;|])\s*(?:יום\s*)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s*[:\-–—]?/g;

const parseSetsReps = (raw: string) => {
  const m = raw.match(SETS_REPS_RE);
  if (!m) return null;
  const sets = parseInt(m[1]);
  const repsMin = parseInt(m[2]);
  const repsMax = m[3] ? parseInt(m[3]) : repsMin;
  return { sets, repsMin, repsMax, matched: m[0] };
};

const parseRir = (raw: string): number => {
  const m = raw.match(/@?\s*RIR\s*(\d+)/i) || raw.match(/רי?ר\s*(\d+)/);
  return m ? parseInt(m[1]) : 2;
};

const cleanName = (raw: string): string => {
  return raw
    .replace(/@?\s*RIR\s*\d+/gi, '')
    .replace(/רי?ר\s*\d+/g, '')
    .replace(SETS_REPS_RE, '')
    .replace(/^\s*[\-–—:;|•·.,]+\s*/, '')
    .replace(/\s*[\-–—:;|•·.,]+\s*$/, '')
    .replace(/[,،]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildExercise = (raw: string): ParsedExercise | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const sr = parseSetsReps(trimmed);
  const rir = parseRir(trimmed);
  const name = cleanName(trimmed);
  if (!name) return null;
  const sets = sr?.sets ?? 3;
  const repsMin = sr?.repsMin ?? 8;
  const repsMax = sr?.repsMax ?? 12;
  return {
    name,
    sets: Math.max(1, sets),
    repsMin,
    repsMax,
    rir,
    weighted: detectWeighted(name),
    raw: trimmed,
  };
};

// Split text by numbered items "1." "2." etc. Returns the chunks (without the numbers)
const splitByNumbers = (text: string): string[] | null => {
  const re = /(?:^|[\s,،])(\d{1,2})\.\s+/g;
  const markers: { numStart: number; chunkStart: number; num: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1]);
    if (num < 1 || num > 30) continue;
    // numStart = position of the digit
    const leadLen = m[0].length - m[0].trimStart().length;
    const numStart = m.index + leadLen;
    const chunkStart = re.lastIndex; // position after "N. " (after the trailing whitespace)
    markers.push({ numStart, chunkStart, num });
  }
  if (markers.length < 2) return null;
  const chunks: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].chunkStart;
    const end = i + 1 < markers.length ? markers[i + 1].numStart : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks.length >= 2 ? chunks : null;
};

const splitByLines = (text: string): string[] | null => {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const exerciseLines = lines.filter(l => SETS_REPS_RE.test(l));
  return exerciseLines.length >= 2 ? exerciseLines : null;
};

const splitBySetRepsSequence = (text: string): string[] | null => {
  const matches = Array.from(text.matchAll(SETS_REPS_GLOBAL_RE));
  if (matches.length < 2) return null;

  const chunks: string[] = [];
  let start = 0;
  for (const match of matches) {
    const matchEnd = (match.index || 0) + match[0].length;
    const rest = text.slice(matchEnd);
    const rirAfter = rest.match(/^\s*(?:@?\s*RIR\s*\d+|רי?ר\s*\d+)/i);
    const end = matchEnd + (rirAfter ? rirAfter[0].length : 0);
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end;
  }
  return chunks.length >= 2 ? chunks : null;
};

export const parseWorkoutDay = (wd: WorkoutDetail): ParsedDay => {
  const raw = (wd.description || '').trim();

  // Try to find where the exercise list starts: look for first "1." pattern
  const firstNumMatch = raw.match(/(?:^|[\s,،])(1)\.\s+/);
  let focus = '';
  let exerciseText = raw;

  if (firstNumMatch && firstNumMatch.index !== undefined) {
    const before = raw.slice(0, firstNumMatch.index).trim();
    const after = raw.slice(firstNumMatch.index + firstNumMatch[0].length - 1); // keep "1." for splitter
    // Clean focus: strip dashes/colons/parens at edges
    focus = before
      .replace(/^\s*[\-–—:]+\s*/, '')
      .replace(/\s*[\-–—:]+\s*$/, '')
      .replace(/[()]/g, '')
      .trim();
    exerciseText = '1.' + after.replace(/^1\./, '');
  } else if (raw.includes('—')) {
    // Legacy format: "FOCUS — exercises"
    const parts = raw.split(/\s*—\s*/);
    focus = parts[0].trim();
    exerciseText = parts.slice(1).join(' — ');
  }

  // Try numbered split first
  let chunks = splitByNumbers(exerciseText);

  // Fallbacks for plans written naturally: one exercise per line, or "חזה 4x10 גב 3x12"
  if (!chunks) chunks = splitByLines(exerciseText);
  if (!chunks) chunks = splitBySetRepsSequence(exerciseText);

  // Fallback to comma split
  if (!chunks) {
    chunks = exerciseText.split(/\s*[,،]\s*/).filter(Boolean);
  }

  const exercises = chunks
    .map(buildExercise)
    .filter((e): e is ParsedExercise => !!e);

  return { day: wd.day, focus, exercises, raw };
};

export const parseAllDays = (details: WorkoutDetail[] | undefined): ParsedDay[] => {
  if (!details) return [];
  return details.map(parseWorkoutDay).filter(d => d.exercises.length > 0);
};

export const sortWorkoutDetails = (details: WorkoutDetail[]): WorkoutDetail[] => {
  return [...details].sort((a, b) => ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day));
};

export const parseWorkoutDetailsFromText = (text: string, fallbackDays: DayOfWeek[] = []): WorkoutDetail[] => {
  const raw = (text || '').trim();
  if (!raw || !SETS_REPS_RE.test(raw)) return [];

  const markers: { day: DayOfWeek; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  DAY_RE.lastIndex = 0;
  while ((m = DAY_RE.exec(raw)) !== null) {
    markers.push({ day: m[1] as DayOfWeek, start: m.index, end: DAY_RE.lastIndex });
  }

  if (markers.length > 0) {
    const byDay = new Map<DayOfWeek, string>();
    markers.forEach((marker, i) => {
      const nextStart = i + 1 < markers.length ? markers[i + 1].start : raw.length;
      const description = raw.slice(marker.end, nextStart).replace(/^\s*[:\-–—]+\s*/, '').trim();
      if (description && SETS_REPS_RE.test(description)) byDay.set(marker.day, description);
    });
    return sortWorkoutDetails(Array.from(byDay, ([day, description]) => ({ day, description })));
  }

  const uniqueFallback = fallbackDays.filter((day, index, arr) => ALL_DAYS.includes(day) && arr.indexOf(day) === index);
  if (uniqueFallback.length === 1) return [{ day: uniqueFallback[0], description: raw }];
  return [];
};
