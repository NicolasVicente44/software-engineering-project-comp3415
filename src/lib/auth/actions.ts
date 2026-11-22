"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACCOUNT_EXISTS_ERROR, friendlyAuthError } from "@/lib/auth/errors";
import {
  parseChangePassword,
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

// change the password from the Profile page; the current password is checked
// first so someone using a signed-in device can't change it (us-11)
export async function changePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseChangePassword(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "You must be signed in to change your password." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.value.currentPassword,
  });
  if (signInError) {
    return {
      error:
        signInError.code === "invalid_credentials"
          ? "Your current password is incorrect."
          : friendlyAuthError(signInError),
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.value.password,
  });
  if (error) return { error: friendlyAuthError(error) };

  return { message: "Your password was changed." };
}

// start an email change; Supabase only switches the email after the
// confirmation link is clicked (us-11)
export async function changeEmail(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseEmail(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to change your email." };

  const email = parsed.value.email;
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return { error: "That is already your email address." };
  }

  const origin = (await headers()).get("origin");
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${origin}/auth/callback?next=/profile` },
  );
  if (error) return { error: friendlyAuthError(error) };

  return {
    message: `We sent a confirmation link to ${email}. Your email changes once you confirm it.`,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
