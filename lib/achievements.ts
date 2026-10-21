import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

export type AchievementGroup = "milestones" | "streaks" | "skill" | "speed";
/** The medal colour; see the --medal-* tokens in globals.css. */
export type AchievementTone = "brand" | "flame" | "frost" | "mint" | "gold";

export const ACHIEVEMENT_GROUPS: { id: AchievementGroup; label: string }[] = [
  { id: "milestones", label: "Milestones" },
  { id: "streaks", label: "Streaks" },
  { id: "skill", label: "Skill" },
  { id: "speed", label: "Speed" },
];

type Meta = {
  title: string;
  /** Worded from the target the server sets, so the copy can't disagree with the rule. */
  describe: (target: number) => string;
  group: AchievementGroup;
  tone: AchievementTone;
  /** Progress is the best the player has reached (a streak, a run) rather than a running total. */
  best?: true;
};

const count = (n: number) => n.toLocaleString("en-US");

/**
 * Copy for each achievement the server works out (see player_achievements in the achievements migration). The
 * rules and targets live in SQL; an id missing here is skipped, so a new one can ship on the server first.
 */
export const ACHIEVEMENT_META = {
  first_solve: { title: "First spark", describe: () => "Solve your first puzzle.", group: "milestones", tone: "brand" },
  solves_10: { title: "Warming up", describe: (n) => `Solve ${count(n)} puzzles.`, group: "milestones", tone: "brand" },
  solves_50: { title: "Sharp mind", describe: (n) => `Solve ${count(n)} puzzles.`, group: "milestones", tone: "brand" },
  solves_100: { title: "Centurion", describe: (n) => `Solve ${count(n)} puzzles.`, group: "milestones", tone: "brand" },
  points_1000: { title: "Four figures", describe: (n) => `Earn ${count(n)} points in total.`, group: "milestones", tone: "brand" },
  all_types: { title: "Well rounded", describe: () => "Solve every kind of puzzle at least once.", group: "milestones", tone: "brand" },
  streak_3: { title: "On a roll", describe: (n) => `Reach a ${n}-day streak.`, group: "streaks", tone: "flame", best: true },
  streak_7: { title: "Week strong", describe: (n) => `Reach a ${n}-day streak.`, group: "streaks", tone: "flame", best: true },
  streak_30: { title: "Habit formed", describe: (n) => `Reach a ${n}-day streak.`, group: "streaks", tone: "flame", best: true },
  streak_100: { title: "Unstoppable", describe: (n) => `Reach a ${n}-day streak.`, group: "streaks", tone: "flame", best: true },
  perfect_week: {
    title: "Perfect week",
    describe: () => "Solve every puzzle from Monday to Sunday without a hint.",
    group: "streaks",
    tone: "flame",
    best: true,
  },
  freeze_saved: {
    title: "Saved by the frost",
    describe: () => "Have a streak freeze cover a missed day.",
    group: "streaks",
    tone: "frost",
  },
  no_hints_10: {
    title: "On your own",
    describe: (n) => `Solve ${count(n)} puzzles in a row without a hint.`,
    group: "skill",
    tone: "mint",
    best: true,
  },
  word_two: { title: "Mind reader", describe: () => "Solve the Word puzzle in two guesses or fewer.", group: "skill", tone: "mint" },
  connections_flawless: { title: "Flawless", describe: () => "Solve Connections without a single mistake.", group: "skill", tone: "mint" },
  bee_pangram: {
    title: "Pangram",
    describe: () => "Find a Spelling bee word that uses all seven letters.",
    group: "skill",
    tone: "mint",
  },
  quick_60: { title: "Quick thinker", describe: () => "Solve a puzzle in under a minute.", group: "speed", tone: "gold" },
  crossword_90: { title: "Speed solver", describe: () => "Solve the Mini crossword in under 90 seconds.", group: "speed", tone: "gold" },
  early_bird: { title: "Early bird", describe: () => "Solve a puzzle within an hour of it coming out.", group: "speed", tone: "gold" },
  daily_best: {
    title: "Fastest of the day",
    describe: () => "Post the day's fastest solve. It counts once the day is over.",
    group: "speed",
    tone: "gold",
  },
} satisfies Record<string, Meta>;

export type AchievementId = keyof typeof ACHIEVEMENT_META;

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  group: AchievementGroup;
  tone: AchievementTone;
  best: boolean;
  /** Towards `target`, capped at it. Metrics like a streak report the best they've reached. */
  progress: number;
  target: number;
  /** UTC date key of the day it was earned, or null while it's locked. */
  earnedOn: string | null;
  /** Whether the player has been shown it; only known on their own achievements. */
  seen: boolean | null;
};

export function isAchievementId(id: string | null | undefined): id is AchievementId {
  return !!id && Object.hasOwn(ACHIEVEMENT_META, id);
}

/** Every achievement for `playerId`, earned or not, in display order. */
export async function fetchAchievements(supabase: SupabaseClient<Database>, playerId: string): Promise<Achievement[]> {
  const { data, error } = await supabase.rpc("player_achievements", { player: playerId });
  if (error) throw error;
  return data.flatMap((row) => {
    if (!isAchievementId(row.id)) return [];
    const meta: Meta = ACHIEVEMENT_META[row.id];
    return {
      id: row.id,
      title: meta.title,
      description: meta.describe(row.target),
      group: meta.group,
      tone: meta.tone,
      best: !!meta.best,
      progress: row.progress,
      target: row.target,
      // The generated types mark every column non-null, but a locked achievement has no earned_on, and `seen` is
      // null on another player's achievements.
      earnedOn: (row.earned_on as string | null) ?? null,
      seen: (row.seen as boolean | null) ?? null,
    };
  });
}

/** Records that the signed-in player has been shown these earned achievements, so they're celebrated once. */
export async function markAchievementsSeen(supabase: SupabaseClient<Database>, ids: AchievementId[]) {
  if (!ids.length) return;
  const { error } = await supabase.rpc("mark_achievements_seen", { ids });
  if (error) throw error;
}

/** Earned achievements, most recently earned first. */
export function recentlyEarned(achievements: Achievement[]): Achievement[] {
  return achievements
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.earnedOn)
    .sort((x, y) => (y.a.earnedOn ?? "").localeCompare(x.a.earnedOn ?? "") || y.i - x.i)
    .map(({ a }) => a);
}

/** The locked achievement the player is closest to, preferring ones they've made a start on. */
export function nextUp(achievements: Achievement[]): Achievement | null {
  let best: Achievement | null = null;
  for (const a of achievements) {
    if (a.earnedOn) continue;
    if (!best || a.progress / a.target > best.progress / best.target) best = a;
  }
  return best;
}
