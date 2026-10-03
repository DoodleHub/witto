import { challengeNumber } from "./date";

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

const WORDS: WordContent[] = [
  { answer: "spark" },
  { answer: "witty" },
  { answer: "plume" },
  { answer: "brisk" },
  { answer: "glade" },
];

const MATH: AnswerContent[] = [
  {
    prompt:
      "A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How many cents does the ball cost?",
    answers: ["5", "5 cents", "0.05", "$0.05", "five"],
    hint: "If the ball were 10¢, the bat would be $1.10 — too much in total.",
    reveal: "5¢ — the bat is $1.05.",
  },
  {
    prompt: "What comes next in the sequence: 2, 6, 12, 20, 30, …?",
    answers: ["42", "forty two", "fortytwo"],
    hint: "Look at the gaps between each number.",
    reveal: "42 — the gaps grow by 2 each time (4, 6, 8, 10, 12).",
  },
  {
    prompt:
      "If 3 cats catch 3 mice in 3 minutes, how many cats are needed to catch 100 mice in 100 minutes?",
    answers: ["3", "three", "3 cats"],
    hint: "How long does it take one cat to catch one mouse?",
    reveal: "3 — each cat catches one mouse every 3 minutes.",
  },
];

const RIDDLES: AnswerContent[] = [
  {
    prompt: "What has keys but no locks, space but no room, and lets you enter but never go inside?",
    answers: ["keyboard", "computer keyboard", "a keyboard", "keyboards"],
    hint: "You might be looking right at it.",
    reveal: "A keyboard.",
  },
  {
    prompt: "What gets wetter the more it dries?",
    answers: ["towel", "a towel", "towels"],
    hint: "You'll find one in the bathroom.",
    reveal: "A towel.",
  },
  {
    prompt: "I have cities but no houses, forests but no trees, and water but no fish. What am I?",
    answers: ["map", "a map", "maps", "atlas"],
    hint: "Explorers never leave home without one.",
    reveal: "A map.",
  },
];

const FACTS: FactContent[] = [
  {
    prompt: "How many hearts does an octopus have?",
    options: ["One", "Two", "Three", "Eight"],
    answer: 2,
    explanation: "Two hearts pump blood through the gills; a third pumps it to the rest of the body.",
  },
  {
    prompt: "Which planet has the shortest day in our solar system?",
    options: ["Mercury", "Earth", "Jupiter", "Neptune"],
    answer: 2,
    explanation: "Jupiter spins once roughly every 10 hours, despite being the largest planet.",
  },
  {
    prompt: "Botanically speaking, which of these is a berry?",
    options: ["Strawberry", "Banana", "Raspberry", "Blackberry"],
    answer: 1,
    explanation: "Bananas are true berries. Strawberries and raspberries are not.",
  },
];

const CROSSWORDS: CrosswordContent[] = [
  {
    grid: ["#MUST", "LANCE", "INDEX", "AGENT", "RARE#"],
    across: {
      1: "Has to",
      5: "Jousting weapon",
      6: "Alphabetical list at the back of a book",
      7: "Secret ___ (spy)",
      8: "Seldom seen",
    },
    down: {
      1: "Japanese comics",
      2: "Beneath",
      3: "Part of a play's act",
      4: "Message sent from a phone",
      5: "Pinocchio, famously",
    },
  },
  {
    grid: ["#SCAR", "STAGE", "PANEL", "IRONY", "TENT#"],
    across: {
      1: "Mark left by a healed wound",
      5: "Where actors perform",
      6: "Group of experts at a conference",
      7: "A fire station burning down, for one",
      8: "Campsite shelter",
    },
    down: {
      1: "Look without blinking",
      2: "Official body of works",
      3: "Hollywood dealmaker",
      4: "Depend (on)",
      5: "Rotisserie rod",
    },
  },
];

const BEES: BeeContent[] = [
  {
    center: "c",
    outer: ["k", "i", "t", "h", "e", "n"],
    goal: 10,
    words: "nice check cent kick tech kitchen chicken neck ticket nick inch thick hence ethnic chick heck chin cheek niche niece tick chic cite ethic kinetic hitch itch hectic".split(" "),
  },
  {
    center: "b",
    outer: ["l", "a", "n", "k", "e", "t"],
    goal: 10,
    words: "been able bank table ball beat battle bell label belt enable beaten beta blank babe blanket tablet banana bent bean ballet bake belle bale beetle blatant bleak beak".split(" "),
  },
  {
    center: "a",
    outer: ["h", "i", "r", "c", "u", "t"],
    goal: 10,
    words: "that hair catch chair chat chart attract cart hatch attach tactic tract trait attic circa aura char aria tart archaic chai haircut arch arctic".split(" "),
  },
];

const CONNECTIONS: ConnectionsContent[] = [
  {
    groups: [
      { theme: "Coffee orders", words: ["LATTE", "MOCHA", "ESPRESSO", "CORTADO"] },
      { theme: "Candy bars", words: ["MARS", "TWIX", "SNICKERS", "KIT KAT"] },
      { theme: "Planets", words: ["VENUS", "SATURN", "MERCURY", "NEPTUNE"] },
      { theme: "___cake", words: ["CUP", "PAN", "CHEESE", "SPONGE"] },
    ],
  },
  {
    groups: [
      { theme: "Fish", words: ["TUNA", "COD", "TROUT", "HALIBUT"] },
      { theme: "Shades of pink", words: ["SALMON", "CORAL", "ROSE", "BLUSH"] },
      { theme: "Singing voices", words: ["BASS", "TENOR", "ALTO", "SOPRANO"] },
      { theme: "Card games", words: ["SNAP", "POKER", "BRIDGE", "RUMMY"] },
    ],
  },
];

function pick<T>(pool: T[], cycle: number): T {
  return pool[((cycle % pool.length) + pool.length) % pool.length];
}

export function typeForNumber(n: number): ChallengeType {
  return CHALLENGE_TYPES[(((n - 1) % 7) + 7) % 7];
}

export function getChallenge(dateKey: string): Challenge & { number: number; dateKey: string } {
  const number = challengeNumber(dateKey);
  const cycle = Math.floor((number - 1) / 7);
  const base = { number, dateKey };
  switch (typeForNumber(number)) {
    case "word":
      return { ...base, type: "word", content: pick(WORDS, cycle) };
    case "math":
      return { ...base, type: "math", content: pick(MATH, cycle) };
    case "riddle":
      return { ...base, type: "riddle", content: pick(RIDDLES, cycle) };
    case "fact":
      return { ...base, type: "fact", content: pick(FACTS, cycle) };
    case "crossword":
      return { ...base, type: "crossword", content: pick(CROSSWORDS, cycle) };
    case "bee":
      return { ...base, type: "bee", content: pick(BEES, cycle) };
    case "connections":
      return { ...base, type: "connections", content: pick(CONNECTIONS, cycle) };
  }
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
