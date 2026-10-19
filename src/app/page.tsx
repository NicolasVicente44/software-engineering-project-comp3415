import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold">COMP 3415 Software Engineering Project</h1>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
          Sign in
        </Link>
        <Link href="/login?mode=signup" className="rounded border border-zinc-400 px-4 py-2">
          Sign up
        </Link>
      </div>
    </main>
  );
}
