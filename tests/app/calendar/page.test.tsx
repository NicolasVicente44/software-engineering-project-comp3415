import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CalendarView from "@/app/calendar/page";

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

    return { from, eq, settingsSelect, settingsEq };
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

const COURSES = {
    data: [course("COMP-2477"), course("COMP-3415"), course("COMP-4411", "failed")],
    error: null,
};

const exportLink = () => screen.queryByRole("link", { name: "Export (.ics)" });

describe("CalendarView (us-10)", () => {
    beforeEach(() => {
        redirect.mockReset();
        // the first term is the next one that has not started yet (us-10)
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 10, 20, 12));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("redirects to login when there is no user", async () => {
        const { from } = mockSupabase({ data: [], error: null }, undefined, null);
        // the real redirect() throws, which stops the page (us-10)
        redirect.mockImplementation(() => {
            throw new Error("NEXT_REDIRECT");
        });

        await expect(CalendarView()).rejects.toThrow("NEXT_REDIRECT");

        expect(redirect).toHaveBeenCalledWith("/login");
        expect(from).not.toHaveBeenCalled();
    });

    it("AC1: shows each term of the saved plan with its dates and courses", async () => {
        const { eq, settingsSelect, settingsEq } = mockSupabase(
            COURSES,
            savedPlan([
                { term: 1, courses: ["COMP-2477"] },
                { term: 2, courses: ["COMP-3415"] },
            ])
        );

        render(await CalendarView());

        expect(eq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(settingsSelect).toHaveBeenCalledWith("credit_limit, saved_plan");
        expect(settingsEq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(screen.getByRole("heading", { name: "My Calendar" })).toBeInTheDocument();
        expect(screen.getByText("Winter 2027 · Term 1")).toBeInTheDocument();
        expect(screen.getByText("Jan 5, 2027 – Apr 23, 2027")).toBeInTheDocument();
        expect(screen.getByText("Fall 2027 · Term 2")).toBeInTheDocument();
        expect(screen.getByText("Sep 8, 2027 – Dec 18, 2027")).toBeInTheDocument();
        expect(screen.getByText("COMP-2477")).toBeInTheDocument();
        expect(screen.getByText("COMP-3415")).toBeInTheDocument();
        // only the saved plan is shown, not a freshly generated one (us-10)
        expect(screen.queryByText("COMP-4411")).not.toBeInTheDocument();
    });

    it("AC2: a different saved plan gives a different calendar", async () => {
        mockSupabase(COURSES, savedPlan([{ term: 1, courses: ["COMP-2477", "COMP-3415"] }]));
        const { unmount } = render(await CalendarView());

        expect(screen.getByText("COMP-3415").closest("[data-slot=card]")).toHaveTextContent("Term 1");
        expect(screen.queryByText("Fall 2027 · Term 2")).not.toBeInTheDocument();
        unmount();

        // e.g. after COMP-2477 is failed and the plan is recalculated (us-05)
        mockSupabase(
            COURSES,
            savedPlan([
                { term: 1, courses: [] },
                { term: 2, courses: ["COMP-2477"] },
                { term: 3, courses: ["COMP-3415"] },
            ])
        );
        render(await CalendarView());

        expect(screen.getByText("No courses this term.")).toBeInTheDocument();
        expect(screen.getByText("COMP-2477").closest("[data-slot=card]")).toHaveTextContent("Fall 2027 · Term 2");
        expect(screen.getByText("COMP-3415").closest("[data-slot=card]")).toHaveTextContent("Winter 2028 · Term 3");
    });

    it("AC3: shows an export link to the .ics download", async () => {
        mockSupabase(COURSES, savedPlan([{ term: 1, courses: ["COMP-2477"] }]));

        render(await CalendarView());

        expect(exportLink()).toHaveAttribute("href", "/calendar/export");
        expect(exportLink()).toHaveAttribute("download");
    });

    it("asks the student to generate a plan when none is saved", async () => {
        mockSupabase(COURSES);

        render(await CalendarView());

        const status = screen.getByRole("status");
        expect(status).toHaveTextContent(
            "You don't have a plan yet. Generate one on the My Plan page."
        );
        expect(within(status).getByRole("link", { name: "My Plan" })).toHaveAttribute("href", "/plan");
        expect(screen.queryByText(/Term 1/)).not.toBeInTheDocument();
        expect(exportLink()).not.toBeInTheDocument();
    });

    it("shows a message and no export for an empty saved plan", async () => {
        mockSupabase({ data: [course("COMP-1411", "completed")], error: null }, savedPlan([]));

        render(await CalendarView());

        expect(
            screen.getByText("No courses to show. Add courses as in progress, failed or dropped on the Courses page.")
        ).toBeInTheDocument();
        expect(exportLink()).not.toBeInTheDocument();
    });

    it("shows courses that could not be placed", async () => {
        mockSupabase(COURSES, savedPlan([], { unschedulable: ["COMP-1000", "COMP-2000"] }));

        render(await CalendarView());

        expect(
            screen.getByText("Could not place: COMP-1000, COMP-2000. Check for circular prerequisites.")
        ).toBeInTheDocument();
    });

    it.each([
        ["courses", { data: null, error: { message: "Error in database" } }, savedPlan([{ term: 1, courses: ["COMP-2477"] }])],
        ["saved plan", COURSES, { data: null, error: { message: "Error in database" } }],
    ])("shows an error and no calendar when the %s cannot be loaded", async (_, courses, settings) => {
        mockSupabase(courses, settings);
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        render(await CalendarView());
        consoleError.mockRestore();

        expect(screen.getByText("Unable to load your plan. Please try again.")).toBeInTheDocument();
        expect(screen.queryByText(/Term 1/)).not.toBeInTheDocument();
        expect(screen.queryByText(/You don't have a plan yet/)).not.toBeInTheDocument();
        expect(exportLink()).not.toBeInTheDocument();
    });
});
