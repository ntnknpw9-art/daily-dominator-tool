export const formatDate = (d: Date) => d.toISOString().split('T')[0];

export const formatDateHebrew = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
};

export const getDatesBetween = (start: string, end: string): string[] => {
  const dates: string[] = [];
  const endDate = new Date(end);
  for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(new Date(d)));
  }
  return dates;
};

export const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const isNowBetween = (start: string, end: string) => {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= timeToMinutes(start) && nowMin < timeToMinutes(end);
};
