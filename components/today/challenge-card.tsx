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
import {
  TYPE_META,
  type AnswerPlay,
  type BeePlay,
  type Challenge,
  type ConnectionsPlay,
  type CrosswordPlay,
  type FactPlay,
  type WordPlay,
} from "@/lib/challenges";
import { markStarted, type DayResult } from "@/lib/progress";

type Props = {
  challenge: Challenge & { number: number; dateKey: string };
  /** The server's verified record of the play, shaped per game. */
  play: unknown;
  result: DayResult | undefined;
  hintUsed: boolean;
};

export function ChallengeCard({ challenge, play, result, hintUsed }: Props) {
  const { dateKey } = challenge;
  const meta = TYPE_META[challenge.type];

  useEffect(() => markStarted(dateKey), [dateKey]);

  const shared = { dateKey, result, hintUsed };
  // The server shapes the play's state to match the challenge type.
  const state = play ?? {};

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
      {challenge.type === "word" && <WordGame {...shared} content={challenge.content} play={state as WordPlay} />}
      {(challenge.type === "riddle" || challenge.type === "math") && (
        <AnswerGame {...shared} content={challenge.content} play={state as AnswerPlay} />
      )}
      {challenge.type === "fact" && <FactGame {...shared} content={challenge.content} play={state as FactPlay} />}
      {challenge.type === "crossword" && <CrosswordGame {...shared} content={challenge.content} play={state as CrosswordPlay} />}
      {challenge.type === "bee" && <BeeGame {...shared} content={challenge.content} play={state as BeePlay} />}
      {challenge.type === "connections" && <ConnectionsGame {...shared} content={challenge.content} play={state as ConnectionsPlay} />}
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
