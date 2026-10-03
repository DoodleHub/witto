import { redirect } from "next/navigation";
import { TodayView } from "@/components/today/today-view";
import { getSessionUser } from "@/lib/auth";

export default async function TodayPage() {
  const user = await getSessionUser();
  // The proxy already sends signed-out visitors to /login; this covers a session that expired in between.
  if (!user) redirect("/login");
  return <TodayView userId={user.id} />;
}
