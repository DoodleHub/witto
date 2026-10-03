import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser, safeNext } from "@/lib/auth";
import { signUp } from "../actions";

export const metadata: Metadata = {
  title: "Create account — Witto",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  return <AuthForm mode="signUp" action={signUp} next={next} />;
}
