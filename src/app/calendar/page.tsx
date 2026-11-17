import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getTermDates } from "@/lib/calendar/terms";
import { loadPlan } from "@/lib/planner/load-plan";
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

    const { plan, error } = await loadPlan(supabase, user.id);

    const dates = getTermDates(plan?.terms.length ?? 0);
    const terms = (plan?.terms ?? []).map((term, i) => ({ ...dates[i], courses: term.courses }));

    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">My Calendar</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your planned courses by term. Term dates are approximate.
                        </p>
                    </div>

                    {terms.length > 0 && (
                        <a href="/calendar/export" download className={buttonVariants()}>
                            Export (.ics)
                        </a>
                    )}
                </div>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                            Unable to load your plan. Please try again.
                        </AlertDescription>
                    </Alert>
                )}

                {plan?.complete && (
                    <Alert className="mt-4" role="status">
                        <AlertDescription>
                            No courses to show. Add courses as in progress or failed on the Courses page.
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
                            <ul className="list-disc pl-5">
                                {term.courses.map((code) => (
                                    <li key={code}>{code}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </main>
        </div>
    );
}
