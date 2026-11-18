// Dates travel between the API and the browser as plain 'YYYY-MM-DD' text.

// Today's date where the user is. Built from the local parts, because
// toISOString() answers in UTC, where the evening is already tomorrow.
export function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// '2026-11-17' -> 'Nov 17'. Built from the parts so the time zone can't shift the day.
export function shortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

// '2026-11-17' -> 'Tuesday, November 17'
export function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
