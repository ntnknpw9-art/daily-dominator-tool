export type Category = 'כושר' | 'לימודים' | 'כסף' | 'משמעת' | 'אישי';

export type DayOfWeek = 'ראשון' | 'שני' | 'שלישי' | 'רביעי' | 'חמישי' | 'שישי' | 'שבת';

export const ALL_DAYS: DayOfWeek[] = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const DAY_INDEX: Record<DayOfWeek, number> = {
  'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6
};

export interface WorkoutDetail {
  day: DayOfWeek;
  description: string;
}

export interface Task {
  id: string;
  name: string;
  meaning: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  category: Category;
  days: DayOfWeek[];
  completions: Record<string, boolean>; // date string -> completed
  workoutDetails?: WorkoutDetail[];
}

export interface UserStats {
  points: number;
  streak: number;
  level: number;
}

export const LEVELS = [
  { name: 'BEGINNER', minPoints: 0 },
  { name: 'BEGINNER+', minPoints: 50 },
  { name: 'DISCIPLINED', minPoints: 150 },
  { name: 'WARRIOR', minPoints: 350 },
  { name: 'MONSTER', minPoints: 600 },
  { name: 'BEAST', minPoints: 1000 },
];

export const ACHIEVEMENTS = [
  { id: '7days', name: '7 ימים רצוף', description: 'השלמת 7 ימים רצוף', condition: (stats: UserStats) => stats.streak >= 7 },
  { id: '10study', name: '10 משימות לימוד', description: 'השלמת 10 משימות לימוד', condition: (_: UserStats, studyCount: number) => studyCount >= 10 },
  { id: '20fitness', name: '20 משימות כושר', description: 'השלמת 20 משימות כושר', condition: (_: UserStats, __: number, fitnessCount: number) => fitnessCount >= 20 },
  { id: '80daily', name: '80% יומי', description: 'השגת 80% ביום אחד', condition: (_: UserStats, __: number, ___: number, dailyPct: number) => dailyPct >= 80 },
  { id: '50tasks', name: '50 משימות הושלמו', description: 'השלמת 50 משימות בסך הכל', condition: (_: UserStats, __: number, ___: number, ____: number, totalDone: number) => totalDone >= 50 },
];
