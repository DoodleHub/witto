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

/** How each challenge plays, for players who want to know before it comes around. */
export const TYPE_GUIDE: Record<ChallengeType, { about: string; rules: string[] }> = {
  word: {
    about: "Find the hidden five-letter word.",
    rules: [
      "You get five guesses, and each must be a real word.",
      "Violet tiles are in the right spot. Gold tiles are in the word but in the wrong spot.",
      "A hint reveals one letter of the word.",
    ],
  },
  math: {
    about: "A number puzzle with a single answer.",
    rules: [
      "Type your answer and submit. Try as many times as you like.",
      "After three misses, you can reveal the answer.",
      "A hint gives you a nudge.",
    ],
  },
  riddle: {
    about: "A riddle to work out in words.",
    rules: [
      "Type your answer and submit. Try as many times as you like.",
      "After three misses, you can reveal the answer.",
      "A hint gives you a nudge.",
    ],
  },
  fact: {
    about: "Spot the true fact among four options.",
    rules: [
      "You get one pick, so choose carefully.",
      "A short explanation follows your pick.",
      "A hint rules out one wrong option.",
    ],
  },
  crossword: {
    about: "A 5×5 crossword with across and down clues.",
    rules: [
      "Tap a square to type. Tap it again to switch between across and down.",
      "Once the grid is full, check it to see which squares are wrong.",
      "A hint fills in one square. You can also reveal the whole grid.",
    ],
  },
  bee: {
    about: "Make words from seven letters.",
    rules: [
      "Words need four or more letters and must use the center letter. Letters can repeat.",
      "Find the target number of words to finish. A pangram uses all seven letters.",
      "A hint gives the first two letters and the length of a word you haven't found.",
    ],
  },
  connections: {
    about: "Sort sixteen words into four groups of four.",
    rules: [
      "Select four words that share something, then submit.",
      "You can make four mistakes. “One away” means three of your four belong together.",
      "A hint reveals the theme of a group.",
    ],
  },
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
/** Today's challenge before the player reveals it: the server holds back its content until the clock starts. */
export type SealedChallenge = { type: ChallengeType; content: null; number: number; dateKey: string };

type ChallengeRow = Database["public"]["Functions"]["challenge_for_day"]["Returns"][number];

function toChallenge(data: ChallengeRow | null, dateKey: string): DailyChallenge | SealedChallenge | null {
  if (!data || !(CHALLENGE_TYPES as readonly string[]).includes(data.type)) return null;
  // The database constrains `type`; `content` is authored to match it.
  return { number: data.number, dateKey, type: data.type, content: data.content } as DailyChallenge | SealedChallenge;
}

/** The challenge released for `dateKey`, sealed until revealed, or null if there isn't one (yet). */
export async function fetchChallenge(
  supabase: SupabaseClient<Database>,
  dateKey: string,
): Promise<DailyChallenge | SealedChallenge | null> {
  const { data, error } = await supabase.rpc("challenge_for_day", { on_day: dateKey }).maybeSingle();
  if (error) throw error;
  return toChallenge(data, dateKey);
}

/** Starts the play of `dateKey` (the server stamps the start time) and returns the challenge's content. */
export async function revealChallenge(
  supabase: SupabaseClient<Database>,
  dateKey: string,
): Promise<DailyChallenge | SealedChallenge | null> {
  const { data, error } = await supabase.rpc("reveal_challenge", { on_day: dateKey }).maybeSingle();
  if (error) throw error;
  return toChallenge(data, dateKey);
}
