"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { HintRow } from "@/components/ui/hint-row";
import type { CrosswordContent, CrosswordPlay } from "@/lib/challenges";
import { playMove, takeHint, useGameState } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

const N = 5;
/** Corner squares follow the board's rounded inner edge (its rounded-xl radius minus the 2px border), so the selection ring isn't clipped. */
const CORNERS: Record<number, string> = {
  0: "rounded-tl-[calc(var(--radius-xl)-2px)]",
  [N - 1]: "rounded-tr-[calc(var(--radius-xl)-2px)]",
  [N * (N - 1)]: "rounded-bl-[calc(var(--radius-xl)-2px)]",
  [N * N - 1]: "rounded-br-[calc(var(--radius-xl)-2px)]",
};
type Dir = "across" | "down";
type Word = { dir: Dir; num: number; cells: number[] };
type State = { entries: string[]; revealed: number[] };

/** Numbering and words from the grid's shape ("#" blocks, anything else a square). */
function buildLayout(grid: string[]) {
  const cells = grid.join("").split("");
  const isBlock = (r: number, c: number) => r < 0 || c < 0 || r >= N || c >= N || grid[r][c] === "#";
  const numbers: (number | null)[] = Array(N * N).fill(null);
  const words: Word[] = [];
  let next = 1;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isBlock(r, c)) continue;
      const across = isBlock(r, c - 1) && !isBlock(r, c + 1);
      const down = isBlock(r - 1, c) && !isBlock(r + 1, c);
      if (!across && !down) continue;
      const num = next++;
      numbers[r * N + c] = num;
      if (across) {
        const cells = [];
        for (let cc = c; !isBlock(r, cc); cc++) cells.push(r * N + cc);
        words.push({ dir: "across", num, cells });
      }
      if (down) {
        const cells = [];
        for (let rr = r; !isBlock(rr, c); rr++) cells.push(rr * N + c);
        words.push({ dir: "down", num, cells });
      }
    }
  }
  return { cells, numbers, words };
}

/** The grid's letters stay on the server, which checks the entries and supplies revealed squares. */
export function CrosswordGame({ dateKey, content, play, result, hintUsed }: GameProps<CrosswordContent, CrosswordPlay>) {
  const { cells, numbers, words } = useMemo(() => buildLayout(content.grid), [content.grid]);
  const [state, setState] = useGameState<State>(dateKey, {
    entries: Array(N * N).fill(""),
    revealed: [],
  });
  // A finished grid opens with nothing selected until the player taps a square.
  const [sel, setSel] = useState(() => (result ? -1 : cells.findIndex((ch) => ch !== "#")));
  const [dir, setDir] = useState<Dir>("across");
  /** Squares the server said were wrong when the player last checked; null when not showing a check. */
  const [wrongCells, setWrongCells] = useState<number[] | null>(null);
  /** The board action waiting on the server, if any. */
  const [busy, setBusy] = useState<"check" | "reveal" | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const done = !!result;

  const wordAt = (cell: number, d: Dir) => words.find((w) => w.dir === d && w.cells.includes(cell));
  const activeWord = wordAt(sel, dir) ?? wordAt(sel, dir === "across" ? "down" : "across");
  const activeDir = activeWord?.dir ?? dir;
  const clue = activeWord ? content[activeWord.dir][activeWord.num] : "";

  // Moving between squares shouldn't scroll the page; phones otherwise jump on every tap and letter.
  function focus(i: number) {
    setSel(i);
    refs.current[i]?.focus({ preventScroll: true });
  }

  // Once the game is over the server shares the answer grid, which then fills the squares.
  const finished = play.solution?.grid.join("").toLowerCase().split("");
  const shown = finished ?? state.entries;
  const isFilled = (entries: string[]) => entries.every((e, i) => cells[i] === "#" || e);

  /** Sends the entries to the server, which solves the play if they're all right. */
  async function check(entries: string[], show: boolean) {
    const feedback = await playMove<{ wrong: number[] }>(dateKey, { entries });
    if (feedback && show) setWrongCells(feedback.wrong);
  }

  function commit(entries: string[], revealed = state.revealed) {
    setState({ entries, revealed });
    setWrongCells(null);
    if (isFilled(entries)) void check(entries, false);
  }

  function step(from: number, delta: 1 | -1) {
    const word = activeWord;
    if (!word) return from;
    const pos = word.cells.indexOf(from) + delta;
    if (pos >= 0 && pos < word.cells.length) return word.cells[pos];
    // Hop to the next/previous word in the same direction.
    const same = words.filter((w) => w.dir === word.dir);
    const wi = (same.indexOf(word) + delta + same.length) % same.length;
    const target = same[wi];
    return delta === 1 ? target.cells[0] : target.cells[target.cells.length - 1];
  }

  function type(i: number, ch: string) {
    if (done || state.revealed.includes(i)) {
      focus(step(i, 1));
      return;
    }
    const entries = [...state.entries];
    entries[i] = ch;
    commit(entries);
    focus(step(i, 1));
  }

  function move(i: number, dr: number, dc: number) {
    let r = Math.floor(i / N) + dr;
    let c = (i % N) + dc;
    while (r >= 0 && c >= 0 && r < N && c < N) {
      if (cells[r * N + c] !== "#") return focus(r * N + c);
      r += dr;
      c += dc;
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault();
      type(i, k.toLowerCase());
    } else if (k === "Backspace") {
      e.preventDefault();
      if (done) return;
      const entries = [...state.entries];
      const target = entries[i] && !state.revealed.includes(i) ? i : step(i, -1);
      if (!state.revealed.includes(target)) entries[target] = "";
      setState({ ...state, entries });
      focus(target);
    } else if (k.startsWith("Arrow")) {
      e.preventDefault();
      const horizontal = k === "ArrowLeft" || k === "ArrowRight";
      if ((horizontal ? "across" : "down") !== dir) return setDir(horizontal ? "across" : "down");
      move(i, k === "ArrowUp" ? -1 : k === "ArrowDown" ? 1 : 0, k === "ArrowLeft" ? -1 : k === "ArrowRight" ? 1 : 0);
    } else if (k === "Tab") {
      e.preventDefault();
      const same = words.filter((w) => w.dir === activeDir);
      const idx = same.findIndex((w) => w === activeWord);
      const target = same[(idx + (e.shiftKey ? -1 : 1) + same.length) % same.length];
      focus(target.cells[0]);
    }
  }

  // Mobile keyboards often report key "Unidentified"; fall back to the input's value.
  function onChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const ch = e.target.value.slice(-1).toLowerCase();
    if (/^[a-z]$/.test(ch)) type(i, ch);
  }

  /** The hint: the server fills in a wrong or empty square, preferring the selected word. */
  async function revealOne() {
    const hint = await takeHint<NonNullable<CrosswordPlay["hint"]>>(dateKey, {
      entries: state.entries,
      pool: activeWord?.cells ?? [],
    });
    if (!hint) return;
    const entries = [...state.entries];
    entries[hint.cell] = hint.letter;
    commit(entries, [...state.revealed, hint.cell]);
  }

  async function checkPuzzle() {
    setBusy("check");
    await check(state.entries, true);
    setBusy(null);
  }

  async function revealAll() {
    setBusy("reveal");
    await playMove(dateKey, { give_up: true });
    setBusy(null);
  }

  const filled = isFilled(state.entries);

  return (
    <>
      <p className="mt-3 text-[17px] text-ink-secondary sm:mt-4 sm:text-xl">
        Fill the grid. Tap a square twice to switch between across and down.
      </p>

      <div className="mt-5 flex flex-col gap-6 sm:mt-8 md:flex-row md:items-start md:gap-10">
        <div className="mx-auto w-full max-w-[340px] shrink-0 md:mx-0">
          <div className="mb-3 flex min-h-16 items-center gap-3 rounded-xl bg-brand-soft px-4 py-2.5 text-[15px] leading-snug text-ink md:hidden">
            {activeWord && (
              <span className="font-semibold text-brand-ink">
                {activeWord.num}
                {activeDir === "across" ? "A" : "D"}
              </span>
            )}
            {clue}
          </div>
          <div
            className="grid grid-cols-5 gap-[2px] overflow-hidden rounded-xl border-2 border-block bg-block"
            role="grid"
            aria-label="Crossword grid"
          >
            {cells.map((ch, i) => {
              if (ch === "#") return <div key={i} className="aspect-square bg-block" />;
              const inWord = activeWord?.cells.includes(i);
              const wrong = !done && state.entries[i] && wrongCells?.includes(i);
              const revealed = state.revealed.includes(i);
              return (
                <div
                  key={i}
                  className={cn(
                    "relative aspect-square",
                    CORNERS[i],
                    i === sel ? "bg-brand-soft" : inWord ? "bg-brand-subtle" : "bg-surface",
                  )}
                >
                  {numbers[i] && (
                    <span className="pointer-events-none absolute left-1 top-0.5 text-[11px] font-semibold text-ink-secondary sm:left-1.5 sm:text-xs">
                      {numbers[i]}
                    </span>
                  )}
                  <input
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    value={shown[i].toUpperCase()}
                    onChange={(e) => onChange(i, e)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onFocus={() => setSel(i)}
                    onSelect={(e) => {
                      // A quick double tap selects the letter; collapse it back to a caret.
                      const el = e.currentTarget;
                      if (el.selectionStart !== el.selectionEnd) el.setSelectionRange(el.value.length, el.value.length);
                    }}
                    onMouseDown={(e) => {
                      // Focus the square ourselves so the browser doesn't scroll it into view.
                      e.preventDefault();
                      // Only a second tap on the focused square flips direction.
                      if (i === sel && document.activeElement === e.currentTarget) {
                        setDir((d) => (d === "across" ? "down" : "across"));
                      } else {
                        focus(i);
                      }
                    }}
                    readOnly={done}
                    maxLength={2}
                    // iOS ignores autoComplete="off"; turning off autocorrect and giving a neutral name
                    // makes its AutoFill suggestion less likely to show.
                    name={`cell-${i}`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-label={`Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}`}
                    className={cn(
                      "absolute inset-0 size-full cursor-pointer bg-transparent pt-2 text-center text-[26px] font-semibold caret-transparent outline-none touch-manipulation select-none selection:bg-transparent [-webkit-touch-callout:none] sm:text-3xl",
                      CORNERS[i],
                      i === sel && "ring-2 ring-inset ring-brand",
                      wrong ? "text-danger" : revealed ? "text-brand-ink" : "text-ink",
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-5 text-[15px] md:grid-cols-1 md:gap-6">
          {(["across", "down"] as const).map((d) => (
            <div key={d}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{d}</p>
              <ol className="space-y-1">
                {words
                  .filter((w) => w.dir === d)
                  .map((w) => {
                    const active = w === activeWord;
                    return (
                      <li key={w.num}>
                        <button
                          type="button"
                          onClick={() => {
                            setDir(d);
                            focus(w.cells[0]);
                          }}
                          className={cn(
                            "flex w-full gap-2 rounded-md px-2 py-1 text-left transition-colors",
                            active ? "bg-brand-soft text-ink" : "text-ink-secondary hover:bg-surface-muted",
                          )}
                        >
                          <span className="w-4 shrink-0 font-semibold">{w.num}</span>
                          {content[d][w.num]}
                        </button>
                      </li>
                    );
                  })}
              </ol>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        {result ? (
          <ResultBanner
            result={result}
            detail={result.status === "solved" ? "Every square, every clue." : "Here's the finished grid."}
          />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <HintRow
              used={hintUsed}
              onHint={revealOne}
              hint="We filled in a square for you."
            />
            <div className="flex items-center justify-center gap-2">
              {filled && (
                <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => void checkPuzzle()}>
                  {busy === "check" ? "Checking…" : "Check puzzle"}
                </Button>
              )}
              <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => void revealAll()}>
                {busy === "reveal" ? "Revealing…" : "Reveal all"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
