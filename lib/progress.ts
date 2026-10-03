import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createClient } from "./supabase/client";
import type { Json } from "./supabase/database.types";
import { addDays, toDateKey } from "./date";

export type DayResult = {
  status: "solved" | "failed";
  timeMs: number;
  hintUsed: boolean;
};

export type Store = {
  results: Record<string, DayResult>;
  games: Record<string, unknown>;
  startedAt: Record<string, number>;
  hints: Record<string, boolean>;
};

/**
 * The signed-in player's progress, mirrored from the `plays` table. Updates apply locally first and are
 * written through to Supabase in order, one queue per day; the server owns timing, so a finished play's
 * solve time is replaced with the server's once the write lands.
 */
type Cache = { userId: string; store: Store | null; error: boolean };

let cache: Cache | null = null;
const listeners = new Set<() => void>();
const queues = new Map<string, Promise<void>>();
const started = new Set<string>();
/** Latest game state per day that hasn't been sent yet; queued writes always send the newest. */
const unsentGames = new Map<string, unknown>();

/** Today's date key. `?date=YYYY-MM-DD` overrides it so every challenge type can be previewed. */
export function getTodayKey(): string {
  const override = new URLSearchParams(window.location.search).get("date");
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return toDateKey(new Date());
}

function emit(next: Cache) {
  cache = next;
  listeners.forEach((l) => l());
}

function setStore(update: (s: Store) => Store) {
  if (!cache?.store) return;
  emit({ ...cache, store: update(cache.store) });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getCache = () => cache;
const noopSubscribe = () => () => {};

function toResult(row: { status: string | null; time_ms: number | null; hint_used: boolean }): DayResult | null {
  if (row.status !== "solved" && row.status !== "failed") return null;
  return { status: row.status, timeMs: row.time_ms ?? 0, hintUsed: row.hint_used };
}

async function load(userId: string) {
  if (cache?.userId === userId) return;
  queues.clear();
  started.clear();
  unsentGames.clear();
  emit({ userId, store: null, error: false });

  const { data, error } = await createClient()
    .from("plays")
    .select("challenge_day, started_at, hint_used, game_state, status, time_ms")
    .eq("user_id", userId);
  if (cache?.userId !== userId) return; // Another player signed in meanwhile.
  if (error) {
    console.error("Failed to load progress", error);
    emit({ userId, store: null, error: true });
    return;
  }

  const store: Store = { results: {}, games: {}, startedAt: {}, hints: {} };
  for (const row of data) {
    const day = row.challenge_day;
    started.add(day);
    store.startedAt[day] = Date.parse(row.started_at);
    if (row.hint_used) store.hints[day] = true;
    if (row.game_state !== null) store.games[day] = row.game_state;
    const result = toResult(row);
    if (result) store.results[day] = result;
  }
  emit({ userId, store, error: false });
}

/** Runs `task` after every earlier write for `dateKey`, so a play is created before it's updated. */
function enqueue(dateKey: string, task: () => PromiseLike<{ error: unknown }>) {
  const userId = cache?.userId;
  const prev = queues.get(dateKey) ?? Promise.resolve();
  const next = prev.then(async () => {
    if (cache?.userId !== userId) return;
    const { error } = await task();
    if (error) console.error(`Failed to save progress for ${dateKey}`, error);
  });
  queues.set(dateKey, next);
}

/** The signed-in player's progress on the client; null while loading and during server render. */
export function useProgress(userId: string): { store: Store | null; error: boolean } {
  useEffect(() => {
    void load(userId);
  }, [userId]);
  const current = useSyncExternalStore(subscribe, getCache, () => null);
  return current?.userId === userId ? current : { store: null, error: false };
}

/** Today's key on the client, null during server render. */
export function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, getTodayKey, () => null);
}

export function markStarted(dateKey: string) {
  if (!cache?.store || started.has(dateKey)) return;
  started.add(dateKey);
  setStore((s) => ({ ...s, startedAt: { ...s.startedAt, [dateKey]: Date.now() } }));
  // The server stamps started_at; a play that already exists (another tab) is left alone.
  enqueue(dateKey, () =>
    createClient()
      .from("plays")
      .upsert({ challenge_day: dateKey }, { onConflict: "user_id,challenge_day", ignoreDuplicates: true }),
  );
}

export function markHint(dateKey: string) {
  if (!cache?.store) return;
  const userId = cache.userId;
  setStore((s) => ({ ...s, hints: { ...s.hints, [dateKey]: true } }));
  enqueue(dateKey, () =>
    createClient().from("plays").update({ hint_used: true }).eq("user_id", userId).eq("challenge_day", dateKey),
  );
}

export function recordResult(dateKey: string, status: DayResult["status"]) {
  const store = cache?.store;
  const userId = cache?.userId;
  if (!store || !userId || store.results[dateKey]) return;
  const startedAt = store.startedAt[dateKey] ?? Date.now();
  const result: DayResult = { status, timeMs: Date.now() - startedAt, hintUsed: !!store.hints[dateKey] };
  setStore((s) => ({ ...s, results: { ...s.results, [dateKey]: result } }));

  enqueue(dateKey, async () => {
    const response = await createClient()
      .from("plays")
      .update({ status })
      .eq("user_id", userId)
      .eq("challenge_day", dateKey)
      .select("status, time_ms, hint_used")
      .maybeSingle();
    // Show the server's verdict and timing (it keeps the first result if another tab finished first).
    const saved = response.data && toResult(response.data);
    if (saved && cache?.userId === userId) setStore((s) => ({ ...s, results: { ...s.results, [dateKey]: saved } }));
    return response;
  });
}

/** Per-day game state (guesses, found words, ...), saved with the rest of the play. */
export function useGameState<T>(dateKey: string, initial: T): [T, (next: T) => void] {
  const current = useSyncExternalStore(subscribe, getCache, () => null);
  const value = (current?.store?.games[dateKey] as T | undefined) ?? initial;
  const set = useCallback(
    (next: T) => {
      if (!cache?.store) return;
      setStore((s) => ({ ...s, games: { ...s.games, [dateKey]: next } }));
      const queued = unsentGames.has(dateKey);
      unsentGames.set(dateKey, next);
      if (queued) return;
      const userId = cache.userId;
      enqueue(dateKey, () => {
        const latest = unsentGames.get(dateKey);
        unsentGames.delete(dateKey);
        return createClient()
          .from("plays")
          .update({ game_state: latest as Json })
          .eq("user_id", userId)
          .eq("challenge_day", dateKey);
      });
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
