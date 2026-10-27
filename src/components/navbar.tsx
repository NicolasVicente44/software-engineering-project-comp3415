import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
  
export function Navbar() {
    return (
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-4xl items-baseline justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight hover:cursor-pointer">
            Grad Path
          </Link>

          <Link href="/courses" className="text-xs font-medium hover:underline">View Courses</Link>
          <Link href="/plan" className="text-xs font-medium hover:underline">My Plan</Link>
        </div>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
    );
}