import { createClient } from "@/lib/supabase/server";

/** A same-origin path to return to after signing in; anything else falls back to "/". */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
}

export type SessionUser = { id: string; email: string; displayName: string };

/** The signed-in user from a verified JWT, or null. Safe for display; not for authorization. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return {
    id: claims.sub,
    email: claims.email ?? "",
    displayName: (claims.user_metadata?.display_name as string | undefined) ?? claims.email ?? "",
  };
}
