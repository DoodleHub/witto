import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/auth";
import { signUp } from "../actions";

export const metadata: Metadata = {
  title: "Create account — Witto",
};

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/");
  return <AuthForm mode="signUp" action={signUp} />;
}
