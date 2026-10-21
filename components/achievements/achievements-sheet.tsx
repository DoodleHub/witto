"use client";

import type { CSSProperties } from "react";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { CheckIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { Overline } from "@/components/ui/overline";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import { ACHIEVEMENT_GROUPS, type Achievement, type AchievementId } from "@/lib/achievements";
import { fromDateKey } from "@/lib/date";
import { Medal, ProgressBar } from "./medal";

export function formatEarned(key: string) {
  return fromDateKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Every achievement, earned or locked, grouped by kind. Tapping a medal opens its detail in place. The parent owns
 * both `open` and `selected`, so a toast can open the sheet straight onto the achievement it announced.
 * `fresh` marks the achievements celebrated this visit with a "New" tag.
 */
export function AchievementsSheet({
  open,
  onClose,
  achievements,
  fresh,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  achievements: Achievement[];
  fresh: ReadonlySet<AchievementId>;
  selected: AchievementId | null;
  onSelect: (id: AchievementId | null) => void;
}) {
  const detail = selected ? achievements.find((a) => a.id === selected) : undefined;

  return (
    <Sheet open={open} onClose={onClose} labelledBy="achievements-sheet-title" className="sm:max-w-[520px]">
      <div className="px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-7 sm:pt-6 sm:pb-7">
        {detail ? (
          <Detail key={detail.id} achievement={detail} onBack={() => onSelect(null)} onClose={onClose} />
        ) : (
          <Overview achievements={achievements} fresh={fresh} onSelect={onSelect} onClose={onClose} />
        )}
      </div>
    </Sheet>
  );
}

function Overview({
  achievements,
  fresh,
  onSelect,
  onClose,
}: {
  achievements: Achievement[];
  fresh: ReadonlySet<AchievementId>;
  onSelect: (id: AchievementId) => void;
  onClose: () => void;
}) {
  const earned = achievements.filter((a) => a.earnedOn).length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="pt-1">
          <Overline className="font-semibold text-brand-ink sm:text-xs">Achievements</Overline>
          <h2
            id="achievements-sheet-title"
            className="mt-1.5 font-serif text-2xl font-semibold tracking-[-0.015em] text-ink sm:text-[28px]"
          >
            {earned} of {achievements.length} earned
          </h2>
        </div>
        <SheetClose onClick={onClose} className="-mr-2" />
      </div>
      <ProgressBar progress={earned} target={achievements.length} className="mt-3" />

      {ACHIEVEMENT_GROUPS.map((group) => {
        const items = achievements.filter((a) => a.group === group.id);
        if (!items.length) return null;
        return (
          <section key={group.id} className="mt-6" aria-labelledby={`achievements-${group.id}`}>
            <div className="flex items-baseline justify-between">
              <Overline className="sm:text-xs">
                <span id={`achievements-${group.id}`}>{group.label}</span>
              </Overline>
              <span className="text-xs tabular-nums text-ink-muted">
                {items.filter((a) => a.earnedOn).length}/{items.length}
              </span>
            </div>
            <ul className="mt-3 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5">
              {items.map((a, i) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    className="group flex w-full flex-col items-center gap-1.5 rounded-lg px-0.5 py-1 text-center outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]"
                  >
                    <span className="relative transition-transform duration-200 ease-[var(--ease-spring)] group-hover:-translate-y-0.5 group-active:scale-95">
                      <Medal
                        achievement={a}
                        size={56}
                        className="stagger animate-scale-in"
                        style={{ "--i": i } as CSSProperties}
                      />
                      {fresh.has(a.id) && (
                        <span className="absolute -right-2 -top-1 animate-scale-in rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-on-brand shadow-brand [animation-delay:300ms]">
                          New
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "line-clamp-2 text-[12px] font-medium leading-tight",
                        a.earnedOn ? "text-ink" : "text-ink-muted",
                      )}
                    >
                      {a.title}
                    </span>
                    <span className="sr-only">
                      {a.earnedOn ? `Earned ${formatEarned(a.earnedOn)}` : `Locked, ${a.progress} of ${a.target}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Detail({ achievement, onBack, onClose }: { achievement: Achievement; onBack: () => void; onClose: () => void }) {
  const earned = achievement.earnedOn !== null;
  const group = ACHIEVEMENT_GROUPS.find((g) => g.id === achievement.group);

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex h-10 items-center gap-1 rounded-full pl-1.5 pr-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <ChevronLeftIcon size={18} />
          All achievements
        </button>
        <SheetClose onClick={onClose} className="-mr-2" />
      </div>

      <div className="mt-4 flex flex-col items-center text-center">
        {/* Earned medals replay their unlock each time they're opened, which is half the fun of looking. */}
        <Medal achievement={achievement} size={112} celebrate={earned} />
        {group && (
          <Chip tone={earned ? "brand" : "neutral"} className="mt-5">
            {group.label}
          </Chip>
        )}
        <h2
          id="achievements-sheet-title"
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
    </div>
  );
}
