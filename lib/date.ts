// Challenge #1 went live on this local date.
export const LAUNCH_DATE = "2026-10-01";

const MS_PER_DAY = 86_400_000;

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Whole calendar days from `a` to `b` (DST-safe). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / MS_PER_DAY);
}

/** 1-based challenge number for a date. */
export function challengeNumber(key: string): number {
  return daysBetween(LAUNCH_DATE, key) + 1;
}

/** "Saturday, October 3" */
export function formatLongDate(key: string): string {
  return fromDateKey(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Monday-first week containing `key`, as date keys. */
export function weekOf(key: string): string[] {
  const offset = (fromDateKey(key).getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(key, i - offset));
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
