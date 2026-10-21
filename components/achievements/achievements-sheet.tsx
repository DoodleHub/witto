"use client";

import { Chip } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import { ACHIEVEMENT_GROUPS, type Achievement } from "@/lib/achievements";
import { fromDateKey } from "@/lib/date";
import { Medal, ProgressBar } from "./medal";

export function formatEarned(key: string) {
  return fromDateKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * One achievement up close: its medal, what it's for, and when it was earned or how far along the player is.
 * Open while `achievement` is set; the parent clears it to close.
 */
export function AchievementSheet({ achievement, onClose }: { achievement: Achievement | null; onClose: () => void }) {
  return (
    <Sheet open={achievement !== null} onClose={onClose} labelledBy="achievement-sheet-title">
      {achievement && (
        <div
          key={achievement.id}
          className="px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-7 sm:pt-6 sm:pb-7"
        >
          <div className="flex justify-end">
            <SheetClose onClick={onClose} className="-mr-2" />
          </div>
          <Detail achievement={achievement} />
        </div>
      )}
    </Sheet>
  );
}

function Detail({ achievement }: { achievement: Achievement }) {
  const earned = achievement.earnedOn !== null;
  const group = ACHIEVEMENT_GROUPS.find((g) => g.id === achievement.group);

  return (
    <div className="flex flex-col items-center text-center">
      {/* Earned medals replay their unlock each time they're opened, which is half the fun of looking. */}
      <Medal achievement={achievement} size={112} celebrate={earned} />
      {group && (
        <Chip tone={earned ? "brand" : "neutral"} className="mt-5">
          {group.label}
        </Chip>
      )}
      <h2
        id="achievement-sheet-title"
        className="mt-3 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-ink"
      >
        {achievement.title}
      </h2>
      <p className="mt-1.5 max-w-[320px] text-[15px] text-ink-secondary sm:text-base">{achievement.description}</p>

      <div className="mt-6 w-full max-w-[320px] border-t border-line pt-4">
        {earned ? (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-success">
            <CheckIcon size={16} className="[&_path]:animate-draw" />
            Earned {formatEarned(achievement.earnedOn!)}
          </p>
        ) : achievement.target > 1 ? (
          <>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-muted">{achievement.best ? "Best so far" : "Progress"}</span>
              <span className="font-semibold tabular-nums text-ink">
                {achievement.progress.toLocaleString("en-US")} / {achievement.target.toLocaleString("en-US")}
              </span>
            </div>
            <ProgressBar progress={achievement.progress} target={achievement.target} className="mt-2" />
          </>
        ) : (
          <p className="text-sm text-ink-muted">Not earned yet. Keep playing!</p>
        )}
      </div>
    </div>
  );
}
