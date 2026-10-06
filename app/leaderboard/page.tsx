import type { Metadata } from "next";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { getSessionUser } from "@/lib/auth";
import { PageTransition } from "@/components/shell/page-transition";

export const metadata: Metadata = {
  title: "Leaderboard — witto",
};

export default async function LeaderboardPage() {
  const user = await getSessionUser();
  return (
    <PageTransition>
      <LeaderboardView signedIn={user !== null} />
    </PageTransition>
  );
}
