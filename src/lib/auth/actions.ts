"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACCOUNT_EXISTS_ERROR, friendlyAuthError } from "@/lib/auth/errors";
import {
  parseCredentials,
  parseEmail,
  parseNewPassword,
  parseSignUp,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseCredentials(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) return { error: friendlyAuthError(error) };

  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseSignUp(formData);
  if (!parsed.ok) return { error: parsed.error };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.value,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: friendlyAuthError(error) };

  // With email confirmation on, Supabase hides duplicate emails by returning a
  // user with no identities instead of an error.
  if (data.user && data.user.identities?.length === 0) {
    return { error: ACCOUNT_EXISTS_ERROR };
  }

  if (data.session) redirect("/dashboard");
  return { message: "Check your email to confirm your account." };
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseEmail(formData);
  if (!parsed.ok) return { error: parsed.error };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.value.email,
    { redirectTo: `${origin}/auth/callback?next=/reset-password` },
  );
  if (error?.code?.startsWith("over_")) {
    return { error: friendlyAuthError(error) };
  }

  // Same response whether or not the account exists, so emails can't be probed.
  return {
    message:
      "If an account exists for that email, we sent a link to reset your password.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseNewPassword(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.value.password,
  });
  if (error) return { error: friendlyAuthError(error) };

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
