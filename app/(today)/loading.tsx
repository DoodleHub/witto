import { TodaySkeleton } from "@/components/today/today-view";
import { PageTransition } from "@/components/shell/page-transition";

export default function Loading() {
  return (
    <PageTransition>
      <TodaySkeleton />
    </PageTransition>
  );
}
