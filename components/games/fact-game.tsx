"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { HintRow } from "@/components/ui/hint-row";
import { CheckIcon } from "@/components/ui/icons";
import type { FactContent, FactPlay } from "@/lib/challenges";
import { playMove, takeHint } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

const LETTERS = ["A", "B", "C", "D"];

export function FactGame({ dateKey, content, play, result, hintUsed }: GameProps<FactContent, FactPlay>) {
  const [pending, setPending] = useState<number | null>(null);
  const picked = play.picked ?? pending;
  // The hint rules out a wrong option.
  const eliminated = play.hint?.eliminated ?? -1;

  async function choose(i: number) {
    if (result || pending !== null) return;
    setPending(i);
    // The server says whether it was right; until then the pick just shows as chosen.
    await playMove(dateKey, { pick: i });
    setPending(null);
  }

  return (
    <>
      <p className="mt-3 max-w-[600px] text-[17px] leading-snug text-ink sm:mt-5 sm:text-[26px] sm:leading-[1.35]">
        {content.prompt}
      </p>

      <div className="mt-5 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-3.5">
        {content.options.map((opt, i) => {
          const isAnswer = i === play.solution?.answer;
          const isPicked = i === picked;
          const out = i === eliminated && !result;
          return (
            <button
              key={opt}
              type="button"
              disabled={!!result || out || pending !== null}
              onClick={() => choose(i)}
              className={cn(
                "flex h-14 items-center gap-3 rounded-[14px] border px-4 text-left text-base font-medium transition-colors sm:h-[60px] sm:text-lg",
                result && isAnswer
                  ? "border-success bg-success-soft text-ink"
                  : result && isPicked
                    ? "border-danger bg-danger-soft text-ink"
                    : i === pending
                      ? "border-brand bg-brand-subtle text-ink"
                      : out
                        ? "border-line bg-surface-muted text-ink-faint line-through"
                        : result
                          ? "border-line bg-surface text-ink-muted"
                          : "border-line-strong bg-surface text-ink shadow-sm hover:border-brand hover:bg-brand-subtle",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  result && isAnswer ? "bg-success text-white" : "bg-surface-muted text-ink-secondary",
                )}
              >
                {result && isAnswer ? <CheckIcon size={15} /> : LETTERS[i]}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      <div className="mt-5 sm:mt-7">
        {result ? (
          <ResultBanner result={result} detail={play.solution?.explanation} />
        ) : (
          <HintRow
            used={hintUsed}
            onHint={() => takeHint(dateKey)}
            hint={
              eliminated >= 0 && (
                <>
                  It&apos;s not <strong className="font-semibold text-ink">{content.options[eliminated]}</strong>.
                </>
              )
            }
          />
        )}
      </div>
    </>
  );
}
