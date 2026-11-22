import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { TermCard, type TermCourse } from "@/components/plan/term-card";
import { DEFAULT_COURSE_CREDITS } from "@/lib/planner/generate-plan";
import { generatePlanAction } from "@/lib/planner/actions";
import type { PlanChange } from "@/lib/planner/recalculate-plan";
import { loadPlanData, planInputs } from "@/lib/planner/saved-plan";
import { normalizeCourseCode } from "@/lib/prerequisites/check";
import { createClient } from "@/lib/supabase/server";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const STATUS_WORDS: Record<string, string> = {
    failed: "failed",
    dropped: "dropped",
    in_progress: "in progress",
    completed: "completed",
};

// rounded so sums like 0.1 + 0.2 display cleanly
const round = (value: number) => Number(value.toFixed(2));

// what a status change did to the plan, in words (us-05)
function describeChange(change: PlanChange): { title: string; details?: string } {
    const status = STATUS_WORDS[change.status] ?? change.status;
    let title: string;

    if (change.status === "completed") {
        title = `${change.course} is completed and was removed from your plan.`;
    } else if (change.to === null) {
        title = `${change.course} was marked ${status} but could not be placed. Check for circular prerequisites.`;
    } else if (change.from === null) {
        title = `${change.course} was marked ${status} and added to Term ${change.to}.`;
    } else if (change.from === change.to) {
        title = `${change.course} was marked ${status}. Your plan did not need to change.`;
    } else {
        title = `${change.course} was marked ${status} and moved from Term ${change.from} to Term ${change.to}.`;
    }

    if (change.moved.length === 0) return { title };

    return {
        title,
        details: `Also moved later because they depend on it: ${change.moved
            .map((course) => `${course.code} (Term ${course.from} → ${course.to})`)
            .join(", ")}.`,
    };
}

export default async function PlanView({
    searchParams,
}: {
    searchParams: Promise<{ changed?: string; error?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { courses, coursesError, settingsError, creditLimit, savedPlan } =
        await loadPlanData(supabase, user.id);

    if (coursesError) {
        console.error("Failed to load courses for plan: ", coursesError);
    }
    if (settingsError) {
        console.error("Failed to load plan settings: ", settingsError);
    }

    const loadFailed = Boolean(coursesError || settingsError);
    const { credits, toTake } = planInputs(courses);
    const creditsOf = (code: string) => credits[code] ?? DEFAULT_COURSE_CREDITS;
    const courseByCode = new Map(courses.map((course) => [normalizeCourseCode(course.course_code), course]));

    // the change is only shown right after the status change that caused it (us-05)
    const change =
        params.changed && savedPlan?.lastChange?.course === normalizeCourseCode(params.changed)
            ? savedPlan.lastChange
            : undefined;
    const movedCodes = new Set([
        ...(change?.moved.map((course) => course.code) ?? []),
        ...(change && change.to !== null && change.from !== change.to ? [change.course] : []),
    ]);

    const plannedCodes = savedPlan?.terms.flatMap((term) => term.courses) ?? [];
    const plannedSet = new Set(plannedCodes);
    const toTakeSet = new Set(toTake);

    // changes made outside the plan (adding or deleting courses, a new credit
    // limit) are not applied automatically, so the student is told to regenerate
    const notInPlan = toTake.filter(
        (code) => !plannedSet.has(code) && !savedPlan?.unschedulable.includes(code)
    );
    const noLongerNeeded = plannedCodes.filter((code) => !toTakeSet.has(code));
    const limitChanged = savedPlan !== null && savedPlan.creditLimit !== creditLimit;
    const outOfDate = savedPlan !== null && (notInPlan.length > 0 || noLongerNeeded.length > 0 || limitChanged);

    const overLimit = plannedCodes.filter((code) => creditsOf(code) > creditLimit);
    const creditsLeft = round(plannedCodes.reduce((sum, code) => sum + creditsOf(code), 0));

    const termCourses = (codes: string[]): TermCourse[] =>
        codes.map((code) => ({
            code,
            name: courseByCode.get(code)?.course_name ?? null,
            credits: creditsOf(code),
            status: courseByCode.get(code)?.status ?? "",
            moved: movedCodes.has(code),
        }));

    const generateButton = (
        <form action={generatePlanAction}>
            <Button type="submit" variant={savedPlan ? "outline" : "default"}>
                {savedPlan ? "Regenerate Plan" : "Generate Plan"}
            </Button>
        </form>
    );

    const changeText = change ? describeChange(change) : null;

    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <h1 className="text-2xl font-semibold">My Academic Plan</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your in-progress, failed and dropped courses, placed after their
                            prerequisites and kept within your credit limit. It updates when
                            you change a course&apos;s status.
                        </p>
                    </div>
                    {!loadFailed && (
                        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
                            <p className="text-sm text-muted-foreground">
                                Credit limit: <strong className="text-foreground">{creditLimit}</strong> per term
                                {" · "}
                                <Link href="/profile" className="font-medium text-foreground underline-offset-4 hover:underline">
                                    Change in Profile
                                </Link>
                            </p>
                            {savedPlan && generateButton}
                        </div>
                    )}
                </div>

                {coursesError && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Unable to load your courses. Please try again.
                        </AlertDescription>
                    </Alert>
                )}

                {settingsError && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Unable to load your credit limit. Please try again.
                        </AlertDescription>
                    </Alert>
                )}

                {params.error === "generate" && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Unable to generate your plan. Please try again.
                        </AlertDescription>
                    </Alert>
                )}

                {changeText && (
                    <Alert role="status">
                        <AlertTitle>Plan updated</AlertTitle>
                        <AlertDescription>
                            <p>{changeText.title}</p>
                            {changeText.details && <p>{changeText.details}</p>}
                        </AlertDescription>
                    </Alert>
                )}

                {!loadFailed && outOfDate && (
                    <Alert role="status">
                        <AlertTitle>Your plan may be out of date</AlertTitle>
                        <AlertDescription>
                            {notInPlan.length > 0 && <p>Not in your plan yet: {notInPlan.join(", ")}.</p>}
                            {noLongerNeeded.length > 0 && <p>No longer needed: {noLongerNeeded.join(", ")}.</p>}
                            {limitChanged && <p>Your credit limit changed since this plan was made.</p>}
                            <p>Regenerate your plan to include these changes.</p>
                        </AlertDescription>
                    </Alert>
                )}

                {!loadFailed && !savedPlan && (
                    <Card>
                        <CardHeader>
                            <CardTitle>You don&apos;t have a plan yet</CardTitle>
                            <CardDescription>
                                Generate a plan from your courses. It is saved, and it updates
                                when you mark a course as completed, failed or dropped.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>{generateButton}</CardContent>
                    </Card>
                )}

                {!loadFailed && savedPlan && savedPlan.terms.length === 0 && savedPlan.unschedulable.length === 0 && (
                    <Alert role="status">
                        <AlertDescription>
                            No courses to plan. Add courses as in progress, failed or dropped on the Courses page.
                        </AlertDescription>
                    </Alert>
                )}

                {!loadFailed && savedPlan && savedPlan.unschedulable.length > 0 && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Could not place: {savedPlan.unschedulable.join(", ")}. Check for circular prerequisites.
                        </AlertDescription>
                    </Alert>
                )}

                {!loadFailed && overLimit.length > 0 && (
                    <Alert role="status">
                        <AlertDescription>
                            Over your {creditLimit} credit limit on their own, so each has a term to itself: {overLimit.join(", ")}.
                        </AlertDescription>
                    </Alert>
                )}

                {!loadFailed && savedPlan && savedPlan.terms.length > 0 && (
                    <>
                        <dl className="grid grid-cols-3 gap-3">
                            {[
                                ["Terms left", savedPlan.terms.length],
                                ["Courses left", plannedCodes.length],
                                ["Credits left", creditsLeft],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-xl border bg-card px-4 py-3">
                                    <dt className="text-xs text-muted-foreground">{label}</dt>
                                    <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {savedPlan.terms.map((term) => (
                                <TermCard
                                    key={term.term}
                                    term={term.term}
                                    courses={termCourses(term.courses)}
                                    creditLimit={creditLimit}
                                />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
