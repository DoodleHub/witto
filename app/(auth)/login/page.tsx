import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser, safeNext } from "@/lib/auth";
import { signIn } from "../actions";

export const metadata: Metadata = {
  title: "Sign in — Witto",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  return <AuthForm mode="signIn" action={signIn} next={next} />;
}
