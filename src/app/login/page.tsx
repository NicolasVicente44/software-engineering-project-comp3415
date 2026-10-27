import { AuthCard } from "@/components/auth/auth-card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthCard mode="signin" error={error} />;
}
