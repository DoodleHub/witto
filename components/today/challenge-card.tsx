"use client";

import { useEffect } from "react";
import { AnswerGame } from "@/components/games/answer-game";
import { BeeGame } from "@/components/games/bee-game";
import { ConnectionsGame } from "@/components/games/connections-game";
import { CrosswordGame } from "@/components/games/crossword-game";
import { FactGame } from "@/components/games/fact-game";
import { WordGame } from "@/components/games/word-game";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TYPE_META, type Challenge } from "@/lib/challenges";
import { markHint, markStarted, recordResult, type DayResult } from "@/lib/progress";

type Props = {
  challenge: Challenge & { number: number; dateKey: string };
  result: DayResult | undefined;
  hintUsed: boolean;
};

export function ChallengeCard({ challenge, result, hintUsed }: Props) {
  const { dateKey } = challenge;
  const meta = TYPE_META[challenge.type];

  useEffect(() => markStarted(dateKey), [dateKey]);

  const shared = {
    dateKey,
    result,
    hintUsed,
    onHint: () => markHint(dateKey),
    onResult: (status: DayResult["status"]) => recordResult(dateKey, status),
  };

  return (
    <Card variant="challenge" className="px-6 pb-7 pt-6 sm:px-12 sm:pb-10 sm:pt-7">
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <Chip className="sm:mt-1">
          <span className="max-[379px]:hidden">
            Today&apos;s challenge <span aria-hidden="true">·</span>
          </span>{" "}
          {meta.label}
        </Chip>
        <p className="whitespace-nowrap pt-0.5 text-xs tabular-nums text-ink-secondary sm:pt-3 sm:text-[15px]">
          {String(challenge.number).padStart(2, "0")} / 365
        </p>
      </div>
      <h2 className="mt-5 font-serif text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:mt-8 sm:text-[52px]">
        {meta.title}
      </h2>
      {challenge.type === "word" && <WordGame {...shared} content={challenge.content} />}
      {(challenge.type === "riddle" || challenge.type === "math") && (
        <AnswerGame {...shared} content={challenge.content} />
      )}
      {challenge.type === "fact" && <FactGame {...shared} content={challenge.content} />}
      {challenge.type === "crossword" && <CrosswordGame {...shared} content={challenge.content} />}
      {challenge.type === "bee" && <BeeGame {...shared} content={challenge.content} />}
      {challenge.type === "connections" && <ConnectionsGame {...shared} content={challenge.content} />}
    </Card>
  );
}

export function ChallengeCardSkeleton() {
  return (
    <Card variant="challenge" className="h-[420px] px-6 pt-6 sm:h-[392px] sm:px-12 sm:pt-7" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded-full bg-brand-soft sm:h-9 sm:w-64" />
      <div className="mt-6 h-10 w-3/4 animate-pulse rounded-lg bg-brand-soft/70 sm:mt-9 sm:h-14" />
      <div className="mt-5 h-6 w-full max-w-[520px] animate-pulse rounded-md bg-brand-soft/50" />
      <div className="mt-2 h-6 w-2/3 max-w-[420px] animate-pulse rounded-md bg-brand-soft/50" />
    </Card>
  );
}
