import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "./auth-shell";
import { LoginForm } from "./login-form";

export function AuthCard({
  mode,
  error,
}: {
  mode: "signin" | "signup";
  error?: string;
}) {
  const isSignUp = mode === "signup";

  return (
    <AuthShell
      title={isSignUp ? "Create your account" : "Welcome back"}
      description={
        isSignUp
          ? "Sign up to start planning your grad path."
          : "Sign in to continue to Grad Path."
      }
      footer={
        <span>
          {isSignUp ? "Already have an account? " : "Need an account? "}
          <Link
            href={isSignUp ? "/login" : "/signup"}
            className="text-foreground underline underline-offset-4"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </Link>
        </span>
      }
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            We could not verify your email link. Please try again.
          </AlertDescription>
        </Alert>
      )}
      <LoginForm mode={mode} />
    </AuthShell>
  );
}
