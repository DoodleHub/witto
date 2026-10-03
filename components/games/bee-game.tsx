"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { HintRow } from "@/components/ui/hint-row";
import { BackspaceIcon, ShuffleIcon } from "@/components/ui/icons";
import type { BeeContent } from "@/lib/challenges";
import { useGameState } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

// Flat-top hexes: center plus six neighbors.
const HEX_W = 84;
const HEX_H = HEX_W * 0.866;
const SLOTS = [
  [0, -1],
  [0.75, -0.5],
  [0.75, 0.5],
  [0, 1],
  [-0.75, 0.5],
  [-0.75, -0.5],
];

export function BeeGame({ dateKey, content, result, onResult, hintUsed, onHint }: GameProps<BeeContent>) {
  const [found, setFound] = useGameState<string[]>(dateKey, []);
  const [outer, setOuter] = useState(content.outer);
  const [current, setCurrent] = useState("");
  const [flash, setFlash] = useState<{ text: string; good: boolean; id: number } | null>(null);
  const letters = new Set([content.center, ...content.outer]);
  const isPangram = (w: string) => [...letters].every((l) => w.includes(l));

  const say = (text: string, good = false) => setFlash({ text, good, id: Date.now() });

  const submit = useCallback(() => {
    const w = current;
    setCurrent("");
    if (w.length < 4) return say("Too short");
    if (!w.includes(content.center)) return say("Missing center letter");
    if ([...w].some((ch) => !letters.has(ch))) return say("Bad letters");
    if (found.includes(w)) return say("Already found");
    if (!content.words.includes(w)) return say("Not in word list");
    const next = [...found, w];
    setFound(next);
    say(isPangram(w) ? "Pangram!" : w.length >= 6 ? "Awesome!" : "Nice!", true);
    if (next.length >= content.goal && !result) onResult("solved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, found, content, result, onResult, setFound]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === "enter") submit();
      else if (k === "backspace") setCurrent((c) => c.slice(0, -1));
      else if (/^[a-z]$/.test(k)) setCurrent((c) => (c.length < 19 ? c + k : c));
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit]);

  function shuffle() {
    const next = [...outer];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOuter(next);
  }

  const hintWord = content.words.find((w) => !found.includes(w) && w.length >= 5) ?? content.words.find((w) => !found.includes(w));
  const progress = Math.min(1, found.length / content.goal);

  return (
    <>
      <p className="mt-3 text-[17px] text-ink-secondary sm:mt-4 sm:text-xl">
        Make words of 4+ letters. Every word must use the center letter. Find {content.goal} to complete today&apos;s challenge.
      </p>

      <div className="mt-6 flex flex-col gap-8 sm:mt-8 md:flex-row md:items-start md:gap-12">
        <div className="flex flex-col items-center md:w-[300px] md:shrink-0">
          <div className="flex h-10 items-center text-[28px] font-semibold uppercase tracking-[0.06em]" aria-live="polite">
            {current ? (
              [...current].map((ch, i) => (
                <span
                  key={i}
                  className={cn(ch === content.center ? "text-brand-ink" : letters.has(ch) ? "text-ink" : "text-ink-faint")}
                >
                  {ch}
                </span>
              ))
            ) : (
              <span className="h-8 w-0.5 animate-pulse bg-brand" />
            )}
          </div>
          <p
            key={flash?.id}
            className={cn(
              "mb-3 h-6 animate-rise text-sm font-semibold",
              flash?.good ? "text-success" : "text-ink-muted",
            )}
          >
            {flash?.text}
          </p>

          <div className="relative" style={{ width: HEX_W * 2.5, height: HEX_H * 3 }}>
            {[content.center, ...outer].map((l, i) => {
              const [dx, dy] = i === 0 ? [0, 0] : SLOTS[i - 1];
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setCurrent((c) => c + l)}
                  className={cn(
                    "absolute flex items-center justify-center text-2xl font-bold uppercase transition-transform active:scale-90",
                    i === 0 ? "bg-brand text-on-brand" : "bg-track text-ink hover:bg-brand-soft",
                  )}
                  style={{
                    width: HEX_W - 6,
                    height: HEX_H - 5,
                    left: HEX_W * 0.75 + dx * HEX_W + 3,
                    top: HEX_H + dy * HEX_H + 2.5,
                    clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)",
                  }}
                >
                  {l}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <Button variant="secondary" size="md" onClick={() => setCurrent((c) => c.slice(0, -1))} aria-label="Delete">
              <BackspaceIcon size={20} />
            </Button>
            <Button variant="secondary" size="md" onClick={shuffle} aria-label="Shuffle letters">
              <ShuffleIcon size={20} />
            </Button>
            <Button size="md" onClick={submit} className="px-7">
              Enter
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-ink">
              {found.length} {found.length === 1 ? "word" : "words"} found
            </p>
            <p className="text-sm text-ink-muted">Goal {content.goal}</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
          <ul className="mt-4 flex min-h-24 flex-wrap content-start gap-2 rounded-xl border border-line bg-surface p-3">
            {found.length === 0 && <li className="p-1 text-sm text-ink-faint">Your words will appear here.</li>}
            {[...found].sort().map((w) => (
              <li
                key={w}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm font-medium capitalize",
                  isPangram(w) ? "bg-brand text-on-brand" : "bg-surface-muted text-ink",
                )}
              >
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        {result ? (
          <ResultBanner
            result={result}
            detail={`${found.length} of ${content.words.length} words found — keep going if you like.`}
          />
        ) : (
          <HintRow
            used={hintUsed}
            onHint={onHint}
            hint={
              hintWord && (
                <>
                  Try a {hintWord.length}-letter word starting with{" "}
                  <strong className="font-semibold uppercase text-brand-ink">{hintWord.slice(0, 2)}</strong>.
                </>
              )
            }
          />
        )}
      </div>
    </>
  );
}
