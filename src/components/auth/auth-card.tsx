import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center text-2xl font-semibold tracking-tight">
          Grad Path
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              {isSignUp ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Sign up to start planning your grad path."
                : "Sign in to continue to Grad Path."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  We could not verify your email link. Please try again.
                </AlertDescription>
              </Alert>
            )}
            <LoginForm mode={mode} />
          </CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            <span>
              {isSignUp ? "Already have an account? " : "Need an account? "}
              <Link
                href={isSignUp ? "/login" : "/signup"}
                className="text-foreground underline underline-offset-4"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
