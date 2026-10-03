import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

export const CHALLENGE_TYPES = [
  "word",
  "math",
  "riddle",
  "fact",
  "crossword",
  "bee",
  "connections",
] as const;

export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const TYPE_META: Record<ChallengeType, { label: string; title: string }> = {
  word: { label: "Word", title: "Five letters. Five tries." },
  math: { label: "Math", title: "Crunch the numbers." },
  riddle: { label: "Riddle", title: "Think outside the box." },
  fact: { label: "Fact", title: "Fact or fiction?" },
  crossword: { label: "Mini crossword", title: "Small grid, big ideas." },
  bee: { label: "Spelling bee", title: "Make a beeline." },
  connections: { label: "Connections", title: "Find the hidden links." },
};

// What players see of each challenge while playing. Answers stay on the server (see play_move).
export type AnswerContent = { prompt: string };
export type WordContent = Record<string, never>;
export type FactContent = { prompt: string; options: string[] };
export type CrosswordContent = {
  grid: string[]; // 5 rows, "#" = block, "." = a square to fill
  across: Record<number, string>;
  down: Record<number, string>;
};
export type BeeContent = { center: string; outer: string[]; goal: number; total: number };
export type ConnectionsContent = { words: string[] };

// The server's verified record of a play (plays.server_state): accepted moves, the hint once taken and
// the solution once finished.
export type Mark = "correct" | "present" | "absent";
export type ConnectionsGroup = { theme: string; words: string[] };

export type AnswerPlay = { hint?: { text: string }; solution?: { reveal: string } };
export type WordPlay = {
  guesses?: string[];
  marks?: Mark[][];
  hint?: { position: number; letter: string };
  solution?: { answer: string };
};
export type FactPlay = { picked?: number; hint?: { eliminated: number }; solution?: { answer: number; explanation: string } };
export type CrosswordPlay = { hint?: { cell: number; letter: string }; solution?: { grid: string[] } };
export type BeePlay = { found?: string[]; hint?: { length: number; start: string } };
export type ConnectionsPlay = {
  solved?: (ConnectionsGroup & { group: number })[];
  mistakes?: number;
  tried?: string[];
  hint?: { theme: string };
  solution?: { groups: ConnectionsGroup[] };
};

export type Challenge =
  | { type: "word"; content: WordContent }
  | { type: "math"; content: AnswerContent }
  | { type: "riddle"; content: AnswerContent }
  | { type: "fact"; content: FactContent }
  | { type: "crossword"; content: CrosswordContent }
  | { type: "bee"; content: BeeContent }
  | { type: "connections"; content: ConnectionsContent };

export type DailyChallenge = Challenge & { number: number; dateKey: string };

/** The challenge released for `dateKey`, or null if there isn't one (yet). */
export async function fetchChallenge(supabase: SupabaseClient<Database>, dateKey: string): Promise<DailyChallenge | null> {
  const { data, error } = await supabase.rpc("challenge_for_day", { on_day: dateKey }).maybeSingle();
  if (error) throw error;
  if (!data || !(CHALLENGE_TYPES as readonly string[]).includes(data.type)) return null;
  // The database constrains `type`; `content` is authored to match it.
  return { number: data.number, dateKey, type: data.type, content: data.content } as DailyChallenge;
}
