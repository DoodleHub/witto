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

export type AnswerContent = { prompt: string; answers: string[]; hint: string; reveal: string };
export type WordContent = { answer: string };
export type FactContent = { prompt: string; options: string[]; answer: number; explanation: string };
export type CrosswordContent = {
  grid: string[]; // 5 rows, "#" = block
  across: Record<number, string>;
  down: Record<number, string>;
};
export type BeeContent = { center: string; outer: string[]; words: string[]; goal: number };
export type ConnectionsContent = { groups: { theme: string; words: string[] }[] };

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
  const { data, error } = await supabase
    .from("challenges")
    .select("number, type, content")
    .eq("day", dateKey)
    .maybeSingle();
  if (error) throw error;
  if (!data || !(CHALLENGE_TYPES as readonly string[]).includes(data.type)) return null;
  // The database constrains `type`; `content` is authored to match it.
  return { number: data.number, dateKey, type: data.type, content: data.content } as DailyChallenge;
}

/** Lowercase, drop punctuation and leading articles so "A keyboard!" matches "keyboard". */
export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9.$ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(a|an|the) /, "");
}

export function isCorrectAnswer(input: string, answers: string[]): boolean {
  const n = normalizeAnswer(input);
  return answers.some((a) => normalizeAnswer(a) === n);
}
