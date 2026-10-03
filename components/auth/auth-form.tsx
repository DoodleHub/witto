"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthField, AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextInput } from "@/components/ui/text-input";

type Field = {
  name: AuthField;
  label: string;
  type: string;
  autoComplete: string;
  hint?: string;
};

const SIGN_UP_FIELDS: Field[] = [
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "displayName", label: "Display name", type: "text", autoComplete: "nickname", hint: "Shown on the leaderboard." },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters, with upper and lowercase letters, a number and a symbol." },
];

const SIGN_IN_FIELDS: Field[] = [
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
];

export function AuthForm({
  mode,
  action,
}: {
  mode: "signIn" | "signUp";
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const signUp = mode === "signUp";
  const fields = signUp ? SIGN_UP_FIELDS : SIGN_IN_FIELDS;

  return (
    <div className="mx-auto max-w-[440px] px-4 pt-6 sm:pt-16">
      <h1 className="text-center font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
        {signUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-center text-ink-secondary">
        {signUp ? "Save your streak and join the leaderboard." : "Sign in to keep your streak going."}
      </p>

      <Card className="mt-8 p-5 sm:p-7">
        <form action={formAction} noValidate className="flex flex-col gap-5">
          {fields.map((f) => {
            const error = state.errors?.[f.name];
            const describedBy = error ? `${f.name}-error` : f.hint ? `${f.name}-hint` : undefined;
            return (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label htmlFor={f.name} className="text-sm font-semibold text-ink">
                  {f.label}
                </label>
                <TextInput
                  id={f.name}
                  name={f.name}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  required
                  defaultValue={f.name === "password" ? undefined : state.values?.[f.name]}
                  invalid={!!error}
                  aria-invalid={!!error}
                  aria-describedby={describedBy}
                />
                {error ? (
                  <p id={`${f.name}-error`} className="text-sm text-danger">
                    {error}
                  </p>
                ) : (
                  f.hint && (
                    <p id={`${f.name}-hint`} className="text-sm text-ink-muted">
                      {f.hint}
                    </p>
                  )
                )}
              </div>
            );
          })}

          {state.message && (
            <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? (signUp ? "Creating account…" : "Signing in…") : signUp ? "Create account" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-ink-secondary">
        {signUp ? "Already have an account? " : "New to Witto? "}
        <Link href={signUp ? "/login" : "/signup"} className="font-semibold text-brand-ink hover:underline">
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
