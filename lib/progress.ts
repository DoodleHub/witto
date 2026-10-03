import { useCallback, useSyncExternalStore } from "react";
import { addDays, toDateKey } from "./date";

export type DayResult = {
  status: "solved" | "failed";
  timeMs: number;
  hintUsed: boolean;
  /** Seeded history so a first-time visitor sees a streak; not a real play. */
  mock?: boolean;
};

type Store = {
  results: Record<string, DayResult>;
  games: Record<string, unknown>;
  startedAt: Record<string, number>;
  hints: Record<string, boolean>;
};

const STORAGE_KEY = "witto:v1";
const SEED_DAYS = 5;

let cache: Store | null = null;
const listeners = new Set<() => void>();

/** Today's date key. `?date=YYYY-MM-DD` overrides it so every challenge type can be previewed. */
export function getTodayKey(): string {
  const override = new URLSearchParams(window.location.search).get("date");
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return toDateKey(new Date());
}

function seed(): Store {
  const today = getTodayKey();
  const results: Record<string, DayResult> = {};
  for (let i = 1; i <= SEED_DAYS; i++) {
    results[addDays(today, -i)] = { status: "solved", timeMs: 60_000 + i * 17_000, hintUsed: false, mock: true };
  }
  return { results, games: {}, startedAt: {}, hints: {} };
}

function read(): Store {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Store) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

function write(next: Store) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode); progress lives for this session only.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const noopSubscribe = () => () => {};

/** Today's key on the client, null during server render. */
export function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, getTodayKey, () => null);
}

/** The whole store on the client, null during server render. */
export function useStore(): Store | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function markStarted(dateKey: string) {
  const s = read();
  if (s.startedAt[dateKey]) return;
  write({ ...s, startedAt: { ...s.startedAt, [dateKey]: Date.now() } });
}

export function markHint(dateKey: string) {
  const s = read();
  write({ ...s, hints: { ...s.hints, [dateKey]: true } });
}

export function recordResult(dateKey: string, status: DayResult["status"]) {
  const s = read();
  if (s.results[dateKey]) return;
  const started = s.startedAt[dateKey] ?? Date.now();
  const result: DayResult = { status, timeMs: Date.now() - started, hintUsed: !!s.hints[dateKey] };
  write({ ...s, results: { ...s.results, [dateKey]: result } });
}

/** Per-day game state (guesses, found words, ...), persisted with the rest of progress. */
export function useGameState<T>(dateKey: string, initial: T): [T, (next: T) => void] {
  const store = useStore();
  const value = (store?.games[dateKey] as T | undefined) ?? initial;
  const set = useCallback(
    (next: T) => {
      const s = read();
      write({ ...s, games: { ...s.games, [dateKey]: next } });
    },
    [dateKey],
  );
  return [value, set];
}

/** Consecutive played days ending today (or yesterday, if today isn't done yet). */
export function streakFor(store: Store, today: string): number {
  let day = store.results[today] ? today : addDays(today, -1);
  let count = 0;
  while (store.results[day]) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
