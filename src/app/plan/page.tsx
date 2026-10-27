import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { generatePlan } from "@/lib/planner/generate-plan";
import { createClient } from "@/lib/supabase/server";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default async function PlanView({
    searchParams,
}: {
    searchParams: Promise<{ generate?: string }>;
}) {
    const generate = (await searchParams).generate === "1";
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: courses, error } = await supabase
        .from("student_courses")
        .select("course_code, status")
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to load courses for plan: ", error);
    }

    // only completed courses count towards the plan (us-04)
    const completed = (courses ?? [])
        .filter((course) => course.status === "completed")
        .map((course) => course.course_code);

    // the plan is only built when the student selects "Generate Plan"
    const plan = generate && !error ? generatePlan(completed) : null;

    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
                <h1 className="text-2xl font-semibold">My Academic Plan</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Remaining required courses, placed after their prerequisites.
                </p>

                <form action="/plan" method="get" className="mt-4">
                    <input type="hidden" name="generate" value="1" />
                    <Button type="submit">Generate Plan</Button>
                </form>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                            Unable to load your courses. Please try again.
                        </AlertDescription>
                    </Alert>
                )}

                {plan?.complete && (
                    <Alert className="mt-4" role="status">
                        <AlertDescription>
                            All requirements are complete. There is nothing left to plan.
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

                {plan?.terms.map((term) => (
                    <Card key={term.term} className="mt-5">
                        <CardHeader>
                            <CardTitle>Term {term.term}</CardTitle>
                            <CardDescription>
                                {term.courses.length} course{term.courses.length === 1 ? "" : "s"}
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
