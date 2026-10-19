import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p>
        Signed in as <strong>{user.email}</strong>
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded border border-zinc-400 px-4 py-2"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
