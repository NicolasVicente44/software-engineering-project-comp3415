import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { CreditLimitForm } from "@/components/plan/credit-limit-form";
import {
    DEFAULT_COURSE_CREDITS,
    DEFAULT_CREDIT_LIMIT,
    generatePlan,
} from "@/lib/planner/generate-plan";
import { normalizeCourseCode } from "@/lib/prerequisites/check";
import { saveCreditLimit } from "@/lib/settings/actions";
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
        .select("course_code, credits, status, prerequisites")
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to load courses for plan: ", error);
    }

    // the student's saved credit limit, or the default if none is saved (us-06)
    const { data: settings, error: settingsError } = await supabase
        .from("student_settings")
        .select("credit_limit")
        .eq("user_id", user.id)
        .maybeSingle();

    if (settingsError) {
        console.error("Failed to load credit limit for plan: ", settingsError);
    }

    const creditLimit = Number(settings?.credit_limit ?? DEFAULT_CREDIT_LIMIT);

    // course code -> credits, from the student's own courses (us-06)
    const credits: Record<string, number> = {};
    // a course without a credit value falls back to the planner's default
    for (const course of courses ?? []) {
        if (course.credits != null) {
            credits[normalizeCourseCode(course.course_code)] = Number(course.credits);
        }
    }

    // build the prereq map for each course to check against 
    const prereqMap: Record<string, string[]> = {};

    for (const course of courses ?? []) {
        const code = normalizeCourseCode(course.course_code);

        prereqMap[code] = (course.prerequisites ?? [])
            .map(normalizeCourseCode);
    }

    // rounded so sums like 0.1 + 0.2 display cleanly
    const termCredits = (codes: string[]) => Number(
        codes.reduce((sum, code) => sum + (credits[code] ?? DEFAULT_COURSE_CREDITS), 0).toFixed(2)
    );

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
    const plan = generate && !error && !settingsError
        ? generatePlan(completed, toTake, prereqMap, { creditLimit, credits })
        : null;

    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
                <h1 className="text-2xl font-semibold">My Academic Plan</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your in-progress and failed courses, placed after their prerequisites
                    and kept within your credit limit.
                </p>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                    <form action="/plan" method="get">
                        <input type="hidden" name="generate" value="1" />
                        <Button type="submit">Generate Plan</Button>
                    </form>

                    {!settingsError && (
                        <CreditLimitForm action={saveCreditLimit} creditLimit={creditLimit} />
                    )}
                </div>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                            Unable to load your courses. Please try again.
                        </AlertDescription>
                    </Alert>
                )}

                {settingsError && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                            Unable to load your credit limit. Please try again.
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

                {plan && plan.overLimit.length > 0 && (
                    <Alert className="mt-4" role="status">
                        <AlertDescription>
                            Over your {creditLimit} credit limit on their own, so each has a term to itself: {plan.overLimit.join(", ")}.
                        </AlertDescription>
                    </Alert>
                )}

                {plan?.terms.map((term) => (
                    <Card key={term.term} className="mt-5">
                        <CardHeader>
                            <CardTitle>Term {term.term}</CardTitle>
                            <CardDescription>
                                {term.courses.length} course{term.courses.length === 1 ? "" : "s"}
                                {" · "}
                                {termCredits(term.courses)} of {creditLimit} credits
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
