import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AchievementsView } from "@/components/achievements/achievements-view";
import { PageTransition } from "@/components/shell/page-transition";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Achievements — witto",
};

export default async function AchievementsPage({ searchParams }: PageProps<"/achievements">) {
  const user = await getSessionUser();
  // The proxy already sends signed-out visitors to /login; this covers a session that expired in between.
  if (!user) redirect("/login?next=/achievements");
  // The unlock toast links to ?a=<id> to open that achievement.
  const { a } = await searchParams;
  return (
    <PageTransition>
      <AchievementsView userId={user.id} focus={typeof a === "string" ? a : null} />
    </PageTransition>
  );
}
