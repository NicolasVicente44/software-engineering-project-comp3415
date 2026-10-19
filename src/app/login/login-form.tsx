"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = {};

function AuthForm({
  action,
  submitLabel,
  autoComplete,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  autoComplete: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={autoComplete}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-green-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Please wait..." : submitLabel}
      </button>
    </form>
  );
}

export function LoginForm({ mode }: { mode: "signin" | "signup" }) {
  return mode === "signin" ? (
    <AuthForm
      action={signIn}
      submitLabel="Sign in"
      autoComplete="current-password"
    />
  ) : (
    <AuthForm
      action={signUp}
      submitLabel="Create account"
      autoComplete="new-password"
    />
  );
}
