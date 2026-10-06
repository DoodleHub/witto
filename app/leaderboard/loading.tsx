import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-view";
import { PageTransition } from "@/components/shell/page-transition";

export default function Loading() {
  return (
    <PageTransition>
      <LeaderboardSkeleton />
    </PageTransition>
  );
}
