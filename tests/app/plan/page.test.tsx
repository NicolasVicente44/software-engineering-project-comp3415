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

const mockSupabase = (
    result: { data: unknown; error: unknown },
    user: { id: string } | null = { id: "user-1234" }
) => {
    const eq = vi.fn().mockResolvedValue(result);
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user } })
        },
        from
    });

    return { from, select, eq };
};

const generated = { searchParams: Promise.resolve({ generate: "1" }) };

describe("PlanView", () => {
    beforeEach(() => {
        redirect.mockReset();
    });

    it("shows the Generate Plan button without a plan until it is selected", async () => {
        mockSupabase({ data: [], error: null });

        render(await PlanView({ searchParams: Promise.resolve({}) }));

        expect(screen.getByRole("button", { name: "Generate Plan" })).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
        expect(
            screen.queryByText("All requirements are complete. There is nothing left to plan.")
        ).not.toBeInTheDocument();
    });

    it("shows the remaining courses in terms for the logged in user", async () => {
        const { from, eq } = mockSupabase({
            data: [
                { course_code: "COMP-1411", status: "completed" },
                { course_code: "COMP-1431", status: "completed" },
                { course_code: "COMP-2412", status: "completed" },
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

    it("shows a message when all requirements are complete", async () => {
        mockSupabase({
            data: ["COMP-1411", "COMP-1431", "COMP-2412", "COMP-2477", "COMP-3415"]
                .map((course_code) => ({ course_code, status: "completed" })),
            error: null
        });

        render(await PlanView(generated));

        expect(
            screen.getByText("All requirements are complete. There is nothing left to plan.")
        ).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
    });

    it("does not count in-progress, failed or dropped courses as completed", async () => {
        mockSupabase({
            data: [
                { course_code: "COMP-1411", status: "in_progress" },
                { course_code: "COMP-1431", status: "failed" },
                { course_code: "COMP-2412", status: "dropped" },
            ],
            error: null
        });

        render(await PlanView(generated));

        expect(screen.getByText("COMP-1411")).toBeInTheDocument();
        expect(screen.getByText("COMP-1431")).toBeInTheDocument();
        expect(screen.getByText("COMP-2412")).toBeInTheDocument();
    });

    it("shows a plan for a student with no courses", async () => {
        mockSupabase({ data: [], error: null });

        render(await PlanView(generated));

        expect(screen.getByText("Term 1")).toBeInTheDocument();
        expect(screen.getByText("COMP-1411")).toBeInTheDocument();
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
        expect(
            screen.queryByText("All requirements are complete. There is nothing left to plan.")
        ).not.toBeInTheDocument();
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
});
