import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/auth";
import { signIn } from "../actions";

export const metadata: Metadata = {
  title: "Sign in — Witto",
};

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  return <AuthForm mode="signIn" action={signIn} />;
}
