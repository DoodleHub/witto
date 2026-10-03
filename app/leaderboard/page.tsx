import type { Metadata } from "next";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Leaderboard — Witto",
};

export default async function LeaderboardPage() {
  const user = await getSessionUser();
  return <LeaderboardView signedIn={user !== null} />;
}
