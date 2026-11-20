import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getTermDates } from "@/lib/calendar/terms";
import { loadPlanData } from "@/lib/planner/saved-plan";
import { createClient } from "@/lib/supabase/server";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

// "2027-01-05" -> "Jan 5, 2027" in utc so the day never shifts (us-10)
const formatDate = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
    });

export default async function CalendarView() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { coursesError, settingsError, savedPlan } = await loadPlanData(supabase, user.id);

    if (coursesError) {
        console.error("Failed to load courses for calendar: ", coursesError);
    }
    if (settingsError) {
        console.error("Failed to load saved plan for calendar: ", settingsError);
    }

    const loadFailed = Boolean(coursesError || settingsError);
    const plan = loadFailed ? null : savedPlan;

    // dates are matched by term number so they line up with my plan (us-10)
    const savedTerms = plan?.terms ?? [];
    const dates = getTermDates(Math.max(0, ...savedTerms.map((term) => term.term)));
    const terms = savedTerms.map((term) => ({ ...dates[term.term - 1], courses: term.courses }));

    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">My Calendar</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your saved plan by term. Term dates are approximate.
                        </p>
                    </div>

                    {terms.length > 0 && (
                        <a href="/calendar/export" download className={buttonVariants()}>
                            Export (.ics)
                        </a>
                    )}
                </div>

                {loadFailed && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                            Unable to load your plan. Please try again.
                        </AlertDescription>
                    </Alert>
                )}

                {!loadFailed && !plan && (
                    <Alert className="mt-4" role="status">
                        <AlertDescription>
                            <p>
                                You don&apos;t have a plan yet. Generate one on the{" "}
                                <Link href="/plan" className="font-medium text-foreground underline underline-offset-4">
                                    My Plan
                                </Link>{" "}
                                page.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {plan && plan.terms.length === 0 && plan.unschedulable.length === 0 && (
                    <Alert className="mt-4" role="status">
                        <AlertDescription>
                            No courses to show. Add courses as in progress, failed or dropped on the Courses page.
                        </AlertDescription>
                    </Alert>
                )}

                {plan && plan.unschedulable.length > 0 && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                            Could not place: {plan.unschedulable.join(", ")}. Check for circular prerequisites.
                        </AlertDescription>
                    </Alert>
                )}

                {terms.map((term) => (
                    <Card key={term.term} className="mt-5">
                        <CardHeader>
                            <CardTitle>{`${term.label} · Term ${term.term}`}</CardTitle>
                            <CardDescription>
                                {`${formatDate(term.start)} – ${formatDate(term.end)}`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {term.courses.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No courses this term.</p>
                            ) : (
                                <ul className="list-disc pl-5">
                                    {term.courses.map((code) => (
                                        <li key={code}>{code}</li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </main>
        </div>
    );
}
