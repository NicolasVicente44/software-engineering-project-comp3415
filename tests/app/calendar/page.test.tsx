import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

const NOTHING_TO_SHOW =
    "No courses to show. Add courses as in progress or failed on the Courses page.";

describe("CalendarView (us-10)", () => {
    beforeEach(() => {
        redirect.mockReset();
        // the first term is the next one that has not started yet (us-10)
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 10, 16, 12));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("AC1: shows each planned term with its dates and courses", async () => {
        const { from, eq } = mockSupabase({
            data: [
                { course_code: "COMP-1411", status: "completed" },
                { course_code: "COMP-2477", status: "in_progress" },
                {
                    course_code: "COMP-3415",
                    status: "in_progress",
                    prerequisites: ["COMP-2477"]
                },
            ],
            error: null
        });

        render(await CalendarView());

        expect(from).toHaveBeenCalledWith("student_courses");
        expect(eq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(screen.getByRole("heading", { name: "My Calendar" })).toBeInTheDocument();
        expect(screen.getByText("Winter 2027 · Term 1")).toBeInTheDocument();
        expect(screen.getByText("Jan 5, 2027 – Apr 23, 2027")).toBeInTheDocument();
        expect(screen.getByText("Fall 2027 · Term 2")).toBeInTheDocument();
        expect(screen.getByText("Sep 8, 2027 – Dec 18, 2027")).toBeInTheDocument();
        expect(screen.getByText("COMP-2477")).toBeInTheDocument();
        expect(screen.getByText("COMP-3415")).toBeInTheDocument();
        expect(screen.queryByText("COMP-1411")).not.toBeInTheDocument();
    });

    it("AC2: shows the updated schedule when the courses change", async () => {
        mockSupabase({
            data: [{ course_code: "COMP-2477", status: "in_progress" }],
            error: null
        });
        const { unmount } = render(await CalendarView());

        expect(screen.getByText("COMP-2477")).toBeInTheDocument();
        expect(screen.queryByText("Fall 2027 · Term 2")).not.toBeInTheDocument();
        unmount();

        mockSupabase({
            data: [
                { course_code: "COMP-2477", status: "completed" },
                { course_code: "COMP-3415", status: "in_progress", prerequisites: ["COMP-2477"] },
                { course_code: "COMP-4411", status: "failed", prerequisites: ["COMP-3415"] },
            ],
            error: null
        });
        render(await CalendarView());

        expect(screen.queryByText("COMP-2477")).not.toBeInTheDocument();
        expect(screen.getByText("COMP-3415")).toBeInTheDocument();
        expect(screen.getByText("Fall 2027 · Term 2")).toBeInTheDocument();
        expect(screen.getByText("COMP-4411")).toBeInTheDocument();
    });

    it("AC3: shows an export link to the .ics download", async () => {
        mockSupabase({
            data: [{ course_code: "COMP-2477", status: "in_progress" }],
            error: null
        });

        render(await CalendarView());

        const exportLink = screen.getByRole("link", { name: "Export (.ics)" });
        expect(exportLink).toHaveAttribute("href", "/calendar/export");
        expect(exportLink).toHaveAttribute("download");
    });

    it("shows a message and no export when there is nothing to plan", async () => {
        mockSupabase({
            data: [{ course_code: "COMP-1411", status: "completed" }],
            error: null
        });

        render(await CalendarView());

        expect(screen.getByText(NOTHING_TO_SHOW)).toBeInTheDocument();
        expect(screen.queryByText(/Term 1/)).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Export (.ics)" })).not.toBeInTheDocument();
    });

    it("shows courses that could not be placed", async () => {
        mockSupabase({
            data: [
                { course_code: "COMP-1000", status: "in_progress", prerequisites: ["COMP-2000"] },
                { course_code: "COMP-2000", status: "in_progress", prerequisites: ["COMP-1000"] },
            ],
            error: null
        });

        render(await CalendarView());

        expect(
            screen.getByText("Could not place: COMP-1000, COMP-2000. Check for circular prerequisites.")
        ).toBeInTheDocument();
    });

    it("shows an error and no calendar when the plan cannot be loaded", async () => {
        mockSupabase({ data: null, error: { message: "Error in database" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        render(await CalendarView());
        consoleError.mockRestore();

        expect(
            screen.getByText("Unable to load your plan. Please try again.")
        ).toBeInTheDocument();
        expect(screen.queryByText(/Term 1/)).not.toBeInTheDocument();
        expect(screen.queryByText(NOTHING_TO_SHOW)).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Export (.ics)" })).not.toBeInTheDocument();
    });

    it("redirects to login when there is no user", async () => {
        const { from } = mockSupabase({ data: [], error: null }, null);
        // the real redirect() throws, which stops the page (us-10)
        redirect.mockImplementation(() => {
            throw new Error("NEXT_REDIRECT");
        });

        await expect(CalendarView()).rejects.toThrow("NEXT_REDIRECT");

        expect(redirect).toHaveBeenCalledWith("/login");
        expect(from).not.toHaveBeenCalled();
    });
});
