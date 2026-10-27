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

    // the plan is built from the student's own courses (us-04): completed
    // ones count as done, in-progress and failed ones still need to be taken
    // and dropped ones are ignored
    const codesWith = (...statuses: string[]) =>
        (courses ?? [])
            .filter((course) => statuses.includes(course.status))
            .map((course) => course.course_code);
    const completed = codesWith("completed");
    const toTake = codesWith("in_progress", "failed");

    // the plan is only built when the student selects "Generate Plan"
    const plan = generate && !error ? generatePlan(completed, toTake) : null;

    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
                <h1 className="text-2xl font-semibold">My Academic Plan</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your in-progress and failed courses, placed after their prerequisites.
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
                            No courses to plan. Add courses as in progress or failed on the Courses page.
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
