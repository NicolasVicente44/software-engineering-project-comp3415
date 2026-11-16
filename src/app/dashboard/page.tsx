import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_COURSE_CREDITS } from "@/lib/planner/generate-plan";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // name and degree goal from the student's profile (us-11)
  const { data: settings } = await supabase
    .from("student_settings")
    .select("full_name, credits_to_graduate")
    .eq("user_id", user.id)
    .maybeSingle();

  const creditsToGraduate =
    settings?.credits_to_graduate == null
      ? null
      : Number(settings.credits_to_graduate);

  let creditsCompleted: number | null = null;

  if (creditsToGraduate != null) {
    const { data: completed } = await supabase
      .from("student_courses")
      .select("credits")
      .eq("user_id", user.id)
      .eq("status", "completed");

    if (completed) {
      creditsCompleted = Number(
        completed
          .reduce(
            (sum, course) =>
              sum + Number(course.credits ?? DEFAULT_COURSE_CREDITS),
            0,
          )
          .toFixed(2),
      );
    }
  }

  const percent =
    creditsToGraduate != null && creditsCompleted != null
      ? Math.min(100, Math.round((creditsCompleted / creditsToGraduate) * 100))
      : null;

  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>
              {settings?.full_name ? `Welcome, ${settings.full_name}` : "Dashboard"}
            </CardTitle>
            <CardDescription>
              Signed in as <strong>{user.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your grad path will show up here.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress to graduation</CardTitle>
            <CardDescription>
              Completed credits out of the credits you need to graduate.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {percent != null ? (
              <div className="flex flex-col gap-2">
                <p>
                  <strong>{creditsCompleted}</strong> of{" "}
                  <strong>{creditsToGraduate}</strong> credits completed ({percent}%)
                </p>
                <Progress value={percent} aria-label="Progress to graduation" />
              </div>
            ) : (
              <p className="text-muted-foreground">
                Set the credits you need to graduate in your{" "}
                <Link href="/profile" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Profile
                </Link>{" "}
                to see your progress.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
