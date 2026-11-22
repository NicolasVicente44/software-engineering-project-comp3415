import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PlanView from "@/app/plan/page";

const { createClient, redirect } = vi.hoisted(() => ({
    createClient: vi.fn(),
    redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient,
}));

vi.mock("next/navigation", () => ({
    redirect,
}));

// these have their own server actions and are not under test here
vi.mock("@/components/navbar", () => ({
    Navbar: () => <nav />,
}));

const mockSupabase = (
    courses: { data: unknown; error: unknown },
    settings: { data: unknown; error: unknown } = { data: null, error: null },
    user: { id: string } | null = { id: "user-1234" }
) => {
    const eq = vi.fn().mockResolvedValue(courses);
    const select = vi.fn().mockReturnValue({ eq });
    const maybeSingle = vi.fn().mockResolvedValue(settings);
    const settingsEq = vi.fn().mockReturnValue({ maybeSingle });
    const settingsSelect = vi.fn().mockReturnValue({ eq: settingsEq });
    const from = vi.fn((table: string) =>
        table === "student_settings" ? { select: settingsSelect } : { select }
    );

    createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user } })
        },
        from
    });

    return { from, eq, settingsEq };
};

const course = (course_code: string, status = "in_progress", extra: Record<string, unknown> = {}) => ({
    course_code,
    course_name: `${course_code} name`,
    credits: 0.5,
    status,
    prerequisites: [],
    ...extra,
});

const savedPlan = (terms: { term: number; courses: string[] }[], extra: Record<string, unknown> = {}) => ({
    data: {
        credit_limit: 2.5,
        saved_plan: { terms, creditLimit: 2.5, generatedAt: "2026-11-16T00:00:00Z", unschedulable: [], ...extra },
    },
    error: null,
});

const page = (params: Record<string, string> = {}) => PlanView({ searchParams: Promise.resolve(params) });

describe("PlanView (us-04, us-05, us-06)", () => {
    beforeEach(() => {
        redirect.mockReset();
    });

    it("redirects to login when there is no user", async () => {
        const { from } = mockSupabase({ data: [], error: null }, undefined, null);
        redirect.mockImplementation(() => {
            throw new Error("NEXT_REDIRECT");
        });

        await expect(page()).rejects.toThrow("NEXT_REDIRECT");

        expect(redirect).toHaveBeenCalledWith("/login");
        expect(from).not.toHaveBeenCalled();
    });

    it("asks the student to generate a plan when none is saved", async () => {
        const { eq, settingsEq } = mockSupabase({ data: [course("COMP-2477")], error: null });

        render(await page());

        expect(eq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(settingsEq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(screen.getByText("You don't have a plan yet")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Generate Plan" })).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
    });

    it("shows the saved plan as term cards with course names, credits and a summary", async () => {
        mockSupabase(
            {
                data: [
                    course("COMP-1411", "completed"),
                    course("COMP-2477", "in_progress", { credits: 1 }),
                    course("COMP-3415", "in_progress", { prerequisites: ["COMP-2477"] }),
                ],
                error: null
            },
            savedPlan([
                { term: 1, courses: ["COMP-2477"] },
                { term: 2, courses: ["COMP-3415"] },
            ])
        );

        render(await page());

        expect(screen.getByRole("button", { name: "Regenerate Plan" })).toBeInTheDocument();
        expect(screen.getByText("Term 1")).toBeInTheDocument();
        expect(screen.getByText("Term 2")).toBeInTheDocument();
        expect(screen.getByText("COMP-2477 name")).toBeInTheDocument();
        expect(screen.getByText("1 of 2.5 credits")).toBeInTheDocument();
        expect(screen.queryByText("COMP-1411")).not.toBeInTheDocument();
        // summary: 2 terms, 2 courses, 1.5 credits left
        expect(screen.getByText("Terms left").nextSibling).toHaveTextContent("2");
        expect(screen.getByText("Courses left").nextSibling).toHaveTextContent("2");
        expect(screen.getByText("Credits left").nextSibling).toHaveTextContent("1.5");
    });

    it("labels failed and dropped courses as retakes", async () => {
        mockSupabase(
            { data: [course("COMP-1411", "failed"), course("COMP-1431", "dropped")], error: null },
            savedPlan([{ term: 1, courses: ["COMP-1411", "COMP-1431"] }])
        );

        render(await page());

        expect(screen.getByText("Retake · failed")).toBeInTheDocument();
        expect(screen.getByText("Retake · dropped")).toBeInTheDocument();
    });

    it("shows what moved right after a status change", async () => {
        mockSupabase(
            {
                data: [
                    course("COMP-1000", "failed"),
                    course("COMP-2000", "in_progress", { prerequisites: ["COMP-1000"] }),
                ],
                error: null
            },
            savedPlan(
                [
                    { term: 1, courses: [] },
                    { term: 2, courses: ["COMP-1000"] },
                    { term: 3, courses: ["COMP-2000"] },
                ],
                {
                    lastChange: {
                        course: "COMP-1000",
                        status: "failed",
                        from: 1,
                        to: 2,
                        moved: [{ code: "COMP-2000", from: 2, to: 3 }],
                    },
                }
            )
        );

        render(await page({ changed: "COMP-1000" }));

        const alert = screen.getByText("Plan updated").closest("[role=status]") as HTMLElement;
        expect(within(alert).getByText("COMP-1000 was marked failed and moved from Term 1 to Term 2.")).toBeInTheDocument();
        expect(within(alert).getByText(/COMP-2000 \(Term 2 → 3\)/)).toBeInTheDocument();
        expect(screen.getAllByText("Moved")).toHaveLength(2);
        expect(screen.getByText("No courses this term.")).toBeInTheDocument();
    });

    it("explains when a completed course is removed", async () => {
        mockSupabase(
            { data: [course("COMP-1000", "completed")], error: null },
            savedPlan([], {
                lastChange: { course: "COMP-1000", status: "completed", from: 1, to: null, moved: [] },
            })
        );

        render(await page({ changed: "comp-1000" }));

        expect(screen.getByText("COMP-1000 is completed and was removed from your plan.")).toBeInTheDocument();
    });

    it("does not show an old change when the page is opened later", async () => {
        mockSupabase(
            { data: [course("COMP-1000", "failed")], error: null },
            savedPlan([{ term: 2, courses: ["COMP-1000"] }], {
                lastChange: { course: "COMP-1000", status: "failed", from: 1, to: 2, moved: [] },
            })
        );

        render(await page());

        expect(screen.queryByText("Plan updated")).not.toBeInTheDocument();
        expect(screen.queryByText("Moved")).not.toBeInTheDocument();
    });

    it("warns when courses or the credit limit changed since the plan was made", async () => {
        mockSupabase(
            { data: [course("COMP-1000"), course("COMP-2000")], error: null },
            {
                data: {
                    credit_limit: 1,
                    saved_plan: {
                        terms: [{ term: 1, courses: ["COMP-1000", "COMP-9999"] }],
                        creditLimit: 2.5,
                        generatedAt: "",
                        unschedulable: [],
                    },
                },
                error: null,
            }
        );

        render(await page());

        expect(screen.getByText("Your plan may be out of date")).toBeInTheDocument();
        expect(screen.getByText("Not in your plan yet: COMP-2000.")).toBeInTheDocument();
        expect(screen.getByText("No longer needed: COMP-9999.")).toBeInTheDocument();
        expect(screen.getByText("Your credit limit changed since this plan was made.")).toBeInTheDocument();
    });

    it("shows the nothing to plan message for an empty saved plan", async () => {
        mockSupabase({ data: [course("COMP-1411", "completed")], error: null }, savedPlan([]));

        render(await page());

        expect(
            screen.getByText("No courses to plan. Add courses as in progress, failed or dropped on the Courses page.")
        ).toBeInTheDocument();
    });

    it("warns about courses that could not be placed", async () => {
        mockSupabase(
            { data: [course("COMP-1000"), course("COMP-2000")], error: null },
            savedPlan([], { unschedulable: ["COMP-1000", "COMP-2000"] })
        );

        render(await page());

        expect(screen.getByText(/Could not place: COMP-1000, COMP-2000/)).toBeInTheDocument();
    });

    it("warns about a course worth more than the credit limit", async () => {
        mockSupabase(
            { data: [course("COMP-1000", "in_progress", { credits: 3 })], error: null },
            savedPlan([{ term: 1, courses: ["COMP-1000"] }])
        );

        render(await page());

        expect(screen.getByText(/Over your 2.5 credit limit on their own/)).toBeInTheDocument();
    });

    it("shows the credit limit with a link to change it in Profile", async () => {
        mockSupabase({ data: [], error: null }, savedPlan([]));

        render(await page());

        expect(screen.getByText(/Credit limit:/)).toHaveTextContent("Credit limit: 2.5 per term");
        expect(screen.getByRole("link", { name: "Change in Profile" })).toHaveAttribute("href", "/profile");
    });

    it("shows an error when generating the plan failed", async () => {
        mockSupabase({ data: [], error: null });

        render(await page({ error: "generate" }));

        expect(screen.getByText("Unable to generate your plan. Please try again.")).toBeInTheDocument();
    });

    it("shows an error and no plan when the courses cannot be loaded", async () => {
        mockSupabase({ data: null, error: { message: "Error in database" } }, savedPlan([{ term: 1, courses: ["COMP-1000"] }]));
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        render(await page());
        consoleError.mockRestore();

        expect(screen.getByText("Unable to load your courses. Please try again.")).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Generate/ })).not.toBeInTheDocument();
    });

    it("shows an error and no plan when the settings cannot be loaded", async () => {
        mockSupabase({ data: [course("COMP-1000")], error: null }, { data: null, error: { message: "Error in database" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        render(await page());
        consoleError.mockRestore();

        expect(screen.getByText("Unable to load your credit limit. Please try again.")).toBeInTheDocument();
        expect(screen.queryByText(/Credit limit:/)).not.toBeInTheDocument();
        expect(screen.queryByText("You don't have a plan yet")).not.toBeInTheDocument();
    });
});
