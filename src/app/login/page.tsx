import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const { mode, error } = await searchParams;
  const isSignUp = mode === "signup";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">
        {isSignUp ? "Create your account" : "Sign in"}
      </h1>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          We could not verify your email link. Please try again.
        </p>
      )}
      <LoginForm mode={isSignUp ? "signup" : "signin"} />
      <p className="text-sm">
        {isSignUp ? "Already have an account? " : "Need an account? "}
        <Link
          href={isSignUp ? "/login" : "/login?mode=signup"}
          className="underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </main>
  );
}
