import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser, safeNext } from "@/lib/auth";
import { signIn } from "../actions";
import { PageTransition } from "@/components/shell/page-transition";

export const metadata: Metadata = {
  title: "Sign in — witto",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  return (
    <PageTransition>
      <AuthForm mode="signIn" action={signIn} next={next} />
    </PageTransition>
  );
}
