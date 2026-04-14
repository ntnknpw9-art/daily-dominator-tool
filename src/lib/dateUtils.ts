// All date/time utilities use Israel timezone (Asia/Jerusalem, UTC+2/+3)

const TIMEZONE = 'Asia/Jerusalem';

/** Get current date/time in Israel timezone */
export const getNowInIsrael = (): Date => {
  const now = new Date();
  const israelStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(israelStr);
};

/** Format date to YYYY-MM-DD in Israel timezone */
export const formatDate = (d: Date): string => {
  const year = d.toLocaleString('en-US', { timeZone: TIMEZONE, year: 'numeric' });
  const month = d.toLocaleString('en-US', { timeZone: TIMEZONE, month: '2-digit' });
  const day = d.toLocaleString('en-US', { timeZone: TIMEZONE, day: '2-digit' });
  return `${year}-${month}-${day}`;
};

/** Format a date string to Hebrew display (e.g. 14.4) */
export const formatDateHebrew = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: TIMEZONE });
};

/** Get all dates between start and end (inclusive) */
export const getDatesBetween = (start: string, end: string): string[] => {
  const dates: string[] = [];
  const endDate = new Date(end + 'T12:00:00');
  const d = new Date(start + 'T12:00:00');
  while (d <= endDate) {
    dates.push(formatDateSimple(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
};

/** Simple YYYY-MM-DD from a date object (no timezone conversion, for iteration) */
const formatDateSimple = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Convert HH:mm to minutes since midnight */
export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/** Check if current Israel time is between start and end (HH:mm) */
export const isNowBetween = (start: string, end: string): boolean => {
  const now = getNowInIsrael();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= timeToMinutes(start) && nowMin < timeToMinutes(end);
};

/** Get current minutes since midnight in Israel */
export const getNowMinutes = (): number => {
  const now = getNowInIsrael();
  return now.getHours() * 60 + now.getMinutes();
};

/** Get today's date string (YYYY-MM-DD) in Israel timezone */
export const getTodayStr = (): string => formatDate(getNowInIsrael());

/** Get Hebrew day name for a date in Israel timezone */
export const getHebrewDayFromDate = (d: Date): string => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[d.getDay()];
};

/** Format full Hebrew date display */
export const formatFullHebrew = (d: Date): string => {
  return d.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
};
