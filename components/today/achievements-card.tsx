"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Medal, ProgressBar } from "@/components/achievements/medal";
import { UnlockToast } from "@/components/achievements/unlock-toast";
import { navTransition } from "@/components/shell/nav";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAchievements,
  markAchievementsSeen,
  nextUp,
  recentlyEarned,
  type Achievement,
  type AchievementId,
} from "@/lib/achievements";
import { createClient } from "@/lib/supabase/client";

/** After a solve, the toast waits for the result banner and confetti to land rather than competing with them. */
const AFTER_SOLVE_MS = 1600;
const ON_LOAD_MS = 700;

/**
 * The player's achievements on the Today page: their latest medals and the one they're closest to, linking to the
 * Achievements tab. It also celebrates: whenever it finds earned achievements the player hasn't been shown (just
 * unlocked by today's play, or earned overnight, like fastest of the day), it raises a toast and records them as
 * seen on the server, so each is celebrated once across devices.
 */
export function AchievementsCard({
  userId,
  today,
  finishedToday,
}: {
  userId: string;
  today: string | null;
  /** Whether today's play is finished; null until progress has loaded. */
  finishedToday: boolean | null;
}) {
  const [list, setList] = useState<Achievement[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<Achievement[] | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const celebrated = useRef(new Set<AchievementId>());
  const lastFinished = useRef(finishedToday);

  // Reloads when the day rolls over and when today's play finishes, which is when new achievements appear.
  useEffect(() => {
    if (!today || finishedToday === null) return;
    const justFinished = lastFinished.current === false && finishedToday;
    lastFinished.current = finishedToday;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const supabase = createClient();

    fetchAchievements(supabase, userId).then(
      (achievements) => {
        if (cancelled) return;
        setList(achievements);
        setFailed(false);
        const unseen = achievements.filter((a) => a.earnedOn && a.seen === false && !celebrated.current.has(a.id));
        if (!unseen.length) return;
        timer = setTimeout(
          () => {
            const ids = unseen.map((a) => a.id);
            ids.forEach((id) => celebrated.current.add(id));
            setToast(unseen);
            markAchievementsSeen(supabase, ids).catch((error) => console.error("Failed to save seen achievements", error));
          },
          justFinished ? AFTER_SOLVE_MS : ON_LOAD_MS,
        );
      },
      (error) => {
        console.error("Failed to load achievements", error);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, today, finishedToday]);

  // Achievements are a bonus, so a failed load leaves the page as it would be without them.
  if (failed && !list) return null;
  if (!list) return <AchievementsCardSkeleton />;

  const earned = recentlyEarned(list);
  const next = nextUp(list);
  const shown = earned.length ? earned.slice(0, 3) : next ? [next] : [];

  return (
    <>
      <Card className="overflow-hidden">
        <Link
          href="/achievements"
          transitionTypes={navTransition(pathname, "/achievements")}
          className="group flex w-full animate-fade-in items-center gap-4 px-6 py-5 text-left outline-none transition-colors hover:bg-surface-muted/60 focus-visible:bg-surface-muted sm:gap-5 sm:px-10 sm:py-6"
        >
          <span className="flex shrink-0 items-center">
            {shown.map((a, i) => (
              <Medal
                key={a.id}
                achievement={a}
                size={44}
                className={i > 0 ? "-ml-3.5 rounded-full ring-[3px] ring-surface" : undefined}
                style={{ zIndex: shown.length - i } as CSSProperties}
              />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-ink sm:text-lg">Achievements</span>
              <span className="whitespace-nowrap text-xs tabular-nums text-ink-muted sm:text-sm">
                {earned.length} of {list.length}
              </span>
            </span>
            {next ? (
              <>
                <span className="mt-0.5 block truncate text-xs text-ink-secondary sm:text-[15px]">
                  Next up: <span className="font-medium text-ink">{next.title}</span>
                  {next.target > 1 && (
                    <span className="tabular-nums text-ink-muted">
                      {" "}
                      · {next.progress.toLocaleString("en-US")}/{next.target.toLocaleString("en-US")}
                    </span>
                  )}
                </span>
                {next.target > 1 ? (
                  <ProgressBar progress={next.progress} target={next.target} className="mt-2 max-w-[260px]" />
                ) : (
                  <span className="block truncate text-xs text-ink-muted sm:text-sm">{next.description}</span>
                )}
              </>
            ) : (
              <span className="mt-0.5 block text-xs text-ink-secondary sm:text-[15px]">Every one earned. Legendary!</span>
            )}
          </span>
          <ChevronRightIcon
            size={20}
            className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-muted"
          />
        </Link>
      </Card>

      {toast && (
        <UnlockToast
          unlocked={toast}
          onOpen={() => {
            setToast(null);
            router.push(toast.length === 1 ? `/achievements?a=${toast[0].id}` : "/achievements");
          }}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

export function AchievementsCardSkeleton() {
  return (
    <Card className="flex items-center gap-4 px-6 py-5 sm:gap-5 sm:px-10 sm:py-6" role="status" aria-busy="true">
      <span className="sr-only">Loading your achievements…</span>
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 sm:h-5" />
        <Skeleton className="h-3 w-48 sm:h-4" />
      </div>
    </Card>
  );
}
