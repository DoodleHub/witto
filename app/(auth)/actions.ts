"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PASSWORD_HINT = "At least 8 characters, with upper and lowercase letters, a number and a symbol.";

export type AuthField = "email" | "displayName" | "password";

export type AuthFormState = {
  errors?: Partial<Record<AuthField, string>>;
  message?: string;
  /** Echoed back so the form keeps what the user typed (React resets forms after an action). */
  values?: { email?: string; displayName?: string };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_RE = /^[\p{L}\p{N}_.\- ]{3,24}$/u;
const MIN_PASSWORD = 8;
// Mirrors the project's Auth password policy: lower, upper, digit and symbol.
const PASSWORD_RULES = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email").trim().toLowerCase();
  const displayName = field(formData, "displayName").trim().replace(/\s+/g, " ");
  const password = field(formData, "password");
  const values = { email, displayName };

  const errors: AuthFormState["errors"] = {};
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!DISPLAY_NAME_RE.test(displayName))
    errors.displayName = "Use 3–24 letters, numbers, spaces, or _ . -";
  if (password.length < MIN_PASSWORD || !PASSWORD_RULES.every((rule) => rule.test(password)))
    errors.password = PASSWORD_HINT;
  if (Object.keys(errors).length) return { errors, values };

  const supabase = await createClient();

  const { data: available, error: availabilityError } = await supabase.rpc("display_name_available", {
    name: displayName,
  });
  if (availabilityError) return { message: "Something went wrong. Please try again.", values };
  if (!available) return { errors: { displayName: "That display name is taken." }, values };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    switch (error.code) {
      case "user_already_exists":
      case "email_exists":
        return { errors: { email: "An account with this email already exists." }, values };
      case "weak_password":
        return { errors: { password: PASSWORD_HINT }, values };
      case "email_address_invalid":
        return { errors: { email: "Enter a valid email address." }, values };
      case "23505":
        // The profile trigger hit the unique index: someone claimed the name since the check above.
        return { errors: { displayName: "That display name is taken." }, values };
      default:
        return { message: error.message, values };
    }
  }

  redirect(safeNext(formData.get("next")));
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  const values = { email };

  if (!email || !password) return { message: "Enter your email and password.", values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      message: error.code === "invalid_credentials" ? "Incorrect email or password." : error.message,
      values,
    };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
