"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { HintRow } from "@/components/ui/hint-row";
import { BackspaceIcon } from "@/components/ui/icons";
import type { Mark, WordContent, WordPlay } from "@/lib/challenges";
import { VALID_GUESSES } from "@/lib/content/words5";
import { playMove, takeHint } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

const ROWS = 5;
const LEN = 5;
const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];

const tileTone: Record<Mark, string> = {
  correct: "bg-tile-correct border-tile-correct text-white",
  present: "bg-tile-present border-tile-present text-white",
  absent: "bg-tile-absent border-tile-absent text-white",
};

/** Guesses are scored on the server, which holds the answer and returns each guess's tile colors. */
export function WordGame({ dateKey, play, result, hintUsed, share }: GameProps<WordContent, WordPlay>) {
  const guesses = play.guesses ?? [];
  const marks = play.marks ?? [];
  const [current, setCurrent] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const done = !!result;

  const keyMarks: Record<string, Mark> = {};
  guesses.forEach((g, r) => {
    marks[r]?.forEach((m, i) => {
      const prev = keyMarks[g[i]];
      if (prev === "correct" || (prev === "present" && m === "absent")) return;
      keyMarks[g[i]] = m;
    });
  });

  const press = useCallback(
    async (key: string) => {
      if (done || checking) return;
      setMessage(null);
      if (key === "enter") {
        if (current.length < LEN) {
          setMessage("Not enough letters");
          setShake((s) => s + 1);
          return;
        }
        if (!VALID_GUESSES.has(current)) {
          setMessage("Not in word list");
          setShake((s) => s + 1);
          return;
        }
        setChecking(true);
        const feedback = await playMove(dateKey, { guess: current });
        setChecking(false);
        if (feedback) setCurrent("");
        else setMessage("Couldn't check that guess. Try again.");
      } else if (key === "backspace") {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[a-z]$/.test(key) && current.length < LEN) {
        setCurrent((c) => c + key);
      }
    },
    [checking, current, dateKey, done],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === "enter" || k === "backspace" || /^[a-z]$/.test(k)) {
        e.preventDefault();
        press(k);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const hint = play.hint;

  return (
    <>
      <p className="mt-3 text-[17px] text-ink-secondary sm:mt-4 sm:text-xl">
        Guess the five-letter word in five tries. Tiles turn violet for the right spot and gold for the wrong spot.
      </p>

      <div className="mt-6 flex flex-col items-center gap-1.5 sm:mt-8 sm:gap-2" role="grid" aria-label="Guesses">
        {Array.from({ length: ROWS }, (_, r) => {
          const submitted = guesses[r];
          const isCurrent = r === guesses.length && !done;
          const letters = submitted ?? (isCurrent ? current : "");
          const rowMarks = submitted ? marks[r] : null;
          return (
            <div
              key={isCurrent ? `cur-${shake}` : r}
              role="row"
              className={cn("flex gap-1.5 sm:gap-2", isCurrent && shake > 0 && message && "animate-shake")}
            >
              {Array.from({ length: LEN }, (_, c) => {
                const ch = letters[c] ?? "";
                return (
                  <div
                    key={c}
                    role="gridcell"
                    aria-label={ch ? `${ch}${rowMarks ? `, ${rowMarks[c]}` : ""}` : "empty"}
                    style={rowMarks ? { animationDelay: `${c * 90}ms` } : undefined}
                    className={cn(
                      "flex size-[52px] items-center justify-center rounded-lg border-2 text-2xl font-bold uppercase sm:size-[60px] sm:text-[28px]",
                      rowMarks
                        ? cn(tileTone[rowMarks[c]], "animate-flip")
                        : ch
                          ? "animate-pop border-ink-muted bg-surface text-ink"
                          : "border-line-strong bg-surface/70",
                    )}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="mt-3 h-5 text-center text-sm font-medium text-danger" aria-live="polite">
        {!done && message}
      </p>

      {done ? (
        <div className="mt-3">
          <ResultBanner
            result={result}
            share={share}
            detail={
              play.solution && (
                <>
                  The word was{" "}
                  <strong className="font-semibold uppercase tracking-wide text-ink">{play.solution.answer}</strong>.
                </>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="mx-auto mt-3 flex max-w-[560px] flex-col gap-1.5 sm:gap-2" aria-label="Keyboard">
            {KEY_ROWS.map((row) => (
              <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
                {row.split("").map((k) => {
                  const key = k === "+" ? "enter" : k === "-" ? "backspace" : k;
                  const mark = keyMarks[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => press(key)}
                      aria-label={key === "backspace" ? "Delete" : key}
                      className={cn(
                        "flex h-12 min-w-0 items-center justify-center rounded-md text-sm font-semibold uppercase transition-colors sm:h-[52px] sm:text-base",
                        key.length > 1 ? "flex-[1.5] px-1 text-xs sm:text-sm" : "flex-1",
                        mark ? tileTone[mark] : "bg-surface text-ink shadow-sm ring-1 ring-line hover:bg-surface-muted",
                      )}
                    >
                      {key === "backspace" ? <BackspaceIcon size={20} /> : key === "enter" ? "Enter" : k}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-6 sm:mt-7">
            <HintRow
              used={hintUsed}
              onHint={() => takeHint(dateKey)}
              hint={
                hint && (
                  <>
                    Letter {hint.position + 1} is{" "}
                    <strong className="font-semibold uppercase text-brand-ink">{hint.letter}</strong>.
                  </>
                )
              }
            />
          </div>
        </>
      )}
    </>
  );
}
