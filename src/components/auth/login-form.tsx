"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, type AuthState } from "@/lib/auth/actions";
import { FormFeedback } from "./form-feedback";
import { NewPasswordFields } from "./new-password-fields";

const initialState: AuthState = {};

function EmailField() {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
      />
    </div>
  );
}

function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <EmailField />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
        />
      </div>
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait..." : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <EmailField />
      <NewPasswordFields />
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait..." : "Create account"}
      </Button>
    </form>
  );
}

export function LoginForm({ mode }: { mode: "signin" | "signup" }) {
  return mode === "signin" ? <SignInForm /> : <SignUpForm />;
}
