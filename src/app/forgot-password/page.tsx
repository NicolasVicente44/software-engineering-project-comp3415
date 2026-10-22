import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to reset it."
      footer={
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4"
        >
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
