import { useSyncExternalStore } from "react";
import { createClient } from "./supabase/client";

/**
 * The current challenge day. Challenges roll over at midnight UTC on the server's clock (see
 * `public.challenge_today()`), so the device clock is only trusted for the offset measured against it.
 */
const DAY_MS = 86_400_000;
/** Fire the rollover a little late so the server is certainly past midnight too. */
const ROLLOVER_SLACK_MS = 1_000;

/** Server clock minus this device's clock. */
let offsetMs = 0;
let synced = false;
let todayKey: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

/** `?date=YYYY-MM-DD` pins the day so every challenge type can be previewed. */
function previewKey(): string | null {
  const override = new URLSearchParams(window.location.search).get("date");
  return override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : null;
}

function refresh() {
  clearTimeout(timer);
  const preview = previewKey();
  if (!preview && !synced) return;
  const now = Date.now() + offsetMs;
  const next = preview ?? new Date(now).toISOString().slice(0, 10);
  if (next !== todayKey) {
    todayKey = next;
    listeners.forEach((l) => l());
  }
  if (!preview && listeners.size > 0) timer = setTimeout(refresh, DAY_MS - (now % DAY_MS) + ROLLOVER_SLACK_MS);
}

async function sync() {
  const sentAt = Date.now();
  const { data, error } = await createClient().rpc("server_now");
  const receivedAt = Date.now();
  // Offline or failing: fall back to the device clock rather than never showing a day.
  if (error) console.error("Failed to read the server clock", error);
  else offsetMs = Date.parse(data) - (sentAt + receivedAt) / 2;
  synced = true;
  refresh();
}

// Timers stall while a device sleeps or a tab is backgrounded, so re-check whenever the app comes back.
function onVisible() {
  if (document.visibilityState !== "visible") return;
  refresh();
  void sync();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisible);
    refresh();
    if (!synced) void sync();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer);
    }
  };
}

const getToday = () => todayKey;

/** Today's challenge day as YYYY-MM-DD; null during server render and until the server clock is read. */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, getToday, () => null);
}
