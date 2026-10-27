import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Grad Path</h1>
      <p className="text-muted-foreground">
        Plan your path to the grade you want.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className={buttonVariants()}>
          Sign in
        </Link>
        <Link
          href="/signup"
          className={buttonVariants({ variant: "outline" })}
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
