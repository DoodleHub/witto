import { redirect } from "next/navigation";
import { TodayView } from "@/components/today/today-view";
import { getSessionUser } from "@/lib/auth";
import { PageTransition } from "@/components/shell/page-transition";

export default async function TodayPage() {
  const user = await getSessionUser();
  // The proxy already sends signed-out visitors to /login; this covers a session that expired in between.
  if (!user) redirect("/login");
  return (
    <PageTransition>
      <TodayView userId={user.id} />
    </PageTransition>
  );
}
