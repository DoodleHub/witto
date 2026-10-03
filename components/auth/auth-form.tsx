"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AuthField, AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
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
  next,
}: {
  mode: "signIn" | "signUp";
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** Where to go after success; carried through the form and the sign-in/sign-up switch link. */
  next: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const signUp = mode === "signUp";
  const fields = signUp ? SIGN_UP_FIELDS : SIGN_IN_FIELDS;
  const [showPassword, setShowPassword] = useState(false);

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
          <input type="hidden" name="next" value={next} />
          {fields.map((f) => {
            const error = state.errors?.[f.name];
            const isPassword = f.name === "password";
            const describedBy = error ? `${f.name}-error` : f.hint ? `${f.name}-hint` : undefined;
            return (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label htmlFor={f.name} className="text-sm font-semibold text-ink">
                  {f.label}
                </label>
                <div className="relative">
                  <TextInput
                    id={f.name}
                    name={f.name}
                    type={isPassword && showPassword ? "text" : f.type}
                    autoComplete={f.autoComplete}
                    required
                    defaultValue={f.name === "password" ? undefined : state.values?.[f.name]}
                    invalid={!!error}
                    aria-invalid={!!error}
                    aria-describedby={describedBy}
                    className={isPassword ? "pr-12" : undefined}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      aria-controls={f.name}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-ink-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none"
                    >
                      {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                  )}
                </div>
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
        <Link
          href={{ pathname: signUp ? "/login" : "/signup", query: next === "/" ? {} : { next } }}
          className="font-semibold text-brand-ink hover:underline"
        >
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}

/** Shared by sign-in and sign-up while the page loads, so it doesn't commit to either one's copy or fields. */
export function AuthFormSkeleton() {
  return (
    <div className="mx-auto max-w-[440px] px-4 pt-6 sm:pt-16" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mx-auto h-9 w-64 rounded-lg" />
      <Skeleton className="mx-auto mt-3 h-5 w-72 max-w-full" />
      <Card className="mt-8 flex flex-col gap-5 p-5 sm:p-7">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        ))}
        <Skeleton className="mt-1 h-12 rounded-lg" />
      </Card>
    </div>
  );
}
