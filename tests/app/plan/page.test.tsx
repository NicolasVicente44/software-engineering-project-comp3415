import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

// the credit limit form is a client component tested on its own
vi.mock("@/components/plan/credit-limit-form", () => ({
    CreditLimitForm: ({ creditLimit }: { creditLimit: number }) => (
        <p>Credit limit form: {creditLimit}</p>
    ),
}));

const mockSupabase = (
    result: { data: unknown; error: unknown },
    user: { id: string } | null = { id: "user-1234" },
    settings: { data: unknown; error: unknown } = { data: null, error: null }
) => {
    const eq = vi.fn().mockResolvedValue(result);
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

    return { from, select, eq, settingsEq };
};

const generated = { searchParams: Promise.resolve({ generate: "1" }) };
const NOTHING_TO_PLAN =
    "No courses to plan. Add courses as in progress or failed on the Courses page.";

describe("PlanView", () => {
    beforeEach(() => {
        redirect.mockReset();
    });

    it("shows the Generate Plan button without a plan until it is selected", async () => {
        mockSupabase({
            data: [{ course_code: "COMP-2477", status: "in_progress" }],
            error: null
        });

        render(await PlanView({ searchParams: Promise.resolve({}) }));

        expect(screen.getByRole("button", { name: "Generate Plan" })).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
        expect(screen.queryByText(NOTHING_TO_PLAN)).not.toBeInTheDocument();
    });

    it("plans the user's own courses in terms for the logged in user", async () => {
        const { from, eq } = mockSupabase({
            data: [
                { course_code: "COMP-1411", status: "completed" },
                { course_code: "COMP-1431", status: "completed" },
                { course_code: "COMP-2412", status: "completed" },
                { course_code: "COMP-2477", status: "in_progress" },
                {
                    course_code: "COMP-3415",
                    status: "in_progress",
                    prerequisites: ["COMP-2477"]
                },
            ],
            error: null
        });

        render(await PlanView(generated));

        expect(from).toHaveBeenCalledWith("student_courses");
        expect(eq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(screen.getByText("Term 1")).toBeInTheDocument();
        expect(screen.getByText("COMP-2477")).toBeInTheDocument();
        expect(screen.queryByText("COMP-1411")).not.toBeInTheDocument();
        // COMP-3415 needs COMP-2477, so it is in a later term
        expect(screen.getByText("Term 2")).toBeInTheDocument();
        expect(screen.getByText("COMP-3415")).toBeInTheDocument();
    });

    it("includes failed courses and ignores completed and dropped ones", async () => {
        mockSupabase({
            data: [
                { course_code: "COMP-1411", status: "failed" },
                { course_code: "COMP-2477", status: "completed" },
                { course_code: "COMP-1431", status: "dropped" },
            ],
            error: null
        });

        render(await PlanView(generated));

        expect(screen.getByText("COMP-1411")).toBeInTheDocument();
        expect(screen.queryByText("COMP-2477")).not.toBeInTheDocument();
        expect(screen.queryByText("COMP-1431")).not.toBeInTheDocument();
    });

    it("shows a message and no terms when there is nothing to plan", async () => {
        mockSupabase({
            data: [
                { course_code: "COMP-1411", status: "completed" },
                { course_code: "COMP-1431", status: "dropped" },
            ],
            error: null
        });

        render(await PlanView(generated));

        expect(screen.getByText(NOTHING_TO_PLAN)).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
    });

    it("shows the nothing to plan message for a student with no courses", async () => {
        mockSupabase({ data: [], error: null });

        render(await PlanView(generated));

        expect(screen.getByText(NOTHING_TO_PLAN)).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
    });

    it("shows an error and no plan when the courses cannot be loaded", async () => {
        mockSupabase({ data: null, error: { message: "Error in database" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        render(await PlanView(generated));
        consoleError.mockRestore();

        expect(
            screen.getByText("Unable to load your courses. Please try again.")
        ).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
        expect(screen.queryByText(NOTHING_TO_PLAN)).not.toBeInTheDocument();
    });

    it("redirects to login when there is no user", async () => {
        const { from } = mockSupabase({ data: [], error: null }, null);
        // the real redirect() throws, which stops the page
        redirect.mockImplementation(() => {
            throw new Error("NEXT_REDIRECT");
        });

        await expect(PlanView(generated)).rejects.toThrow("NEXT_REDIRECT");

        expect(redirect).toHaveBeenCalledWith("/login");
        expect(from).not.toHaveBeenCalled();
    });

    describe("credit limit (us-06)", () => {
        const course = (course_code: string, credits: number, status = "in_progress") =>
            ({ course_code, credits, status });

        it("uses the default limit when the student has not saved one", async () => {
            const { settingsEq } = mockSupabase({
                data: [course("COMP-1000", 1), course("COMP-2000", 1), course("COMP-3000", 1)],
                error: null
            });

            render(await PlanView(generated));

            expect(settingsEq).toHaveBeenCalledWith("user_id", "user-1234");
            expect(screen.getByText("Credit limit form: 2.5")).toBeInTheDocument();
            // 3 x 1.0 credits do not fit under 2.5, so the third waits a term
            expect(screen.getByText("Term 2")).toBeInTheDocument();
            expect(screen.getByText(/2 courses · 2 of 2\.5 credits/)).toBeInTheDocument();
        });

        it("keeps every term at or under the student's saved limit", async () => {
            mockSupabase(
                {
                    data: [course("COMP-1000", 0.5), course("COMP-2000", 0.5), course("COMP-3000", 0.5)],
                    error: null
                },
                undefined,
                { data: { credit_limit: 1 }, error: null }
            );

            render(await PlanView(generated));

            expect(screen.getByText("Credit limit form: 1")).toBeInTheDocument();
            expect(screen.getByText(/2 courses · 1 of 1 credits/)).toBeInTheDocument();
            expect(screen.getByText(/1 course · 0\.5 of 1 credits/)).toBeInTheDocument();
        });

        it("warns about a course worth more than the limit", async () => {
            mockSupabase(
                { data: [course("COMP-1000", 1.5)], error: null },
                undefined,
                { data: { credit_limit: 1 }, error: null }
            );

            render(await PlanView(generated));

            expect(screen.getByText(/Over your 1 credit limit on their own/)).toBeInTheDocument();
            expect(screen.getByText("COMP-1000")).toBeInTheDocument();
        });

        it("uses the default credits for a course with no credit value", async () => {
            mockSupabase(
                {
                    data: [
                        { course_code: "COMP-1000", credits: null, status: "in_progress" },
                        course("COMP-2000", 0.5),
                    ],
                    error: null
                },
                undefined,
                { data: { credit_limit: 0.5 }, error: null }
            );

            render(await PlanView(generated));

            // at 0.5 credits each, the two courses cannot share a 0.5 limit
            expect(screen.getByText("Term 2")).toBeInTheDocument();
            expect(screen.getAllByText(/1 course · 0\.5 of 0\.5 credits/)).toHaveLength(2);
        });

        it("shows an error and no plan when the limit cannot be loaded", async () => {
            mockSupabase(
                { data: [course("COMP-1000", 1)], error: null },
                undefined,
                { data: null, error: { message: "Error in database" } }
            );
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

            render(await PlanView(generated));
            consoleError.mockRestore();

            expect(
                screen.getByText("Unable to load your credit limit. Please try again.")
            ).toBeInTheDocument();
            expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
            expect(screen.queryByText(/Credit limit form/)).not.toBeInTheDocument();
        });
    });
});
