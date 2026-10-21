import { AchievementsSkeleton } from "@/components/achievements/achievements-view";
import { PageTransition } from "@/components/shell/page-transition";

export default function Loading() {
  return (
    <PageTransition>
      <AchievementsSkeleton />
    </PageTransition>
  );
}
