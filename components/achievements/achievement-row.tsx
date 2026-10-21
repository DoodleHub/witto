import type { CSSProperties } from "react";
import { cn } from "@/components/ui/cn";
import { CheckIcon } from "@/components/ui/icons";
import { formatEarned, type Achievement } from "@/lib/achievements";
import { Medal, ProgressBar } from "./medal";

/**
 * One achievement laid out in full, so nothing needs a tap to explain it: the medal, what it's for, and when it
 * was earned or how far along the player is. `celebrate` spins the medal in for a newly seen unlock, and
 * `highlighted` briefly lights the row up when something links to it.
 */
export function AchievementRow({
  achievement: a,
  index = 0,
  fresh = false,
  celebrate = false,
  highlighted = false,
}: {
  achievement: Achievement;
  index?: number;
  fresh?: boolean;
  celebrate?: boolean;
  highlighted?: boolean;
}) {
  const earned = a.earnedOn !== null;
  return (
    <div
      id={`achievement-${a.id}`}
      className={cn(
        "-mx-2 flex scroll-mt-24 items-center gap-3.5 rounded-xl px-2 py-3 transition-colors duration-500 sm:gap-4",
        highlighted && "bg-brand-subtle ring-2 ring-brand-line",
      )}
    >
      <Medal
        achievement={a}
        size={52}
        celebrate={celebrate}
        className={celebrate ? undefined : "stagger animate-scale-in"}
        style={{ "--i": index } as CSSProperties}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className={cn("text-[15px] font-semibold", earned ? "text-ink" : "text-ink-secondary")}>{a.title}</span>
          {fresh && (
            <span className="animate-scale-in rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-on-brand [animation-delay:600ms]">
              New
            </span>
          )}
        </p>
        <p className="text-[13px] leading-snug text-ink-secondary sm:text-sm">{a.description}</p>
        {earned ? (
          <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-success">
            <CheckIcon size={13} />
            Earned {formatEarned(a.earnedOn!)}
          </p>
        ) : (
          a.target > 1 && (
            <p className="mt-1.5 flex items-center gap-2">
              <ProgressBar progress={a.progress} target={a.target} className="max-w-[180px] flex-1" />
              <span className="text-[12px] tabular-nums text-ink-muted">
                {a.progress.toLocaleString("en-US")}/{a.target.toLocaleString("en-US")}
                {a.best && " best"}
              </span>
            </p>
          )
        )}
      </div>
    </div>
  );
}
