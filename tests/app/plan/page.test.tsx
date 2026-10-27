import { describe, expect, it, vi } from "vitest";
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

const mockSupabase = (result: { data: unknown; error: unknown }) => {
    const eq = vi.fn().mockResolvedValue(result);
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "user-1234" } }
            })
        },
        from
    });

    return { from, select, eq };
};

describe("PlanView", () => {
    it("shows the remaining courses in terms for the logged in user", async () => {
        const { from, eq } = mockSupabase({
            data: [
                { course_code: "COMP-1411", status: "completed" },
                { course_code: "COMP-1431", status: "completed" },
                { course_code: "COMP-2412", status: "completed" },
            ],
            error: null
        });

        render(await PlanView());

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

        render(await PlanView());

        expect(
            screen.getByText("All requirements are complete. There is nothing left to plan.")
        ).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
    });

    it("does not count in-progress courses as completed", async () => {
        mockSupabase({
            data: [{ course_code: "COMP-1411", status: "in_progress" }],
            error: null
        });

        render(await PlanView());

        expect(screen.getByText("COMP-1411")).toBeInTheDocument();
    });

    it("shows an error when the courses cannot be loaded", async () => {
        mockSupabase({ data: null, error: { message: "Error in database" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        render(await PlanView());
        consoleError.mockRestore();

        expect(
            screen.getByText("Unable to load your courses. Please try again.")
        ).toBeInTheDocument();
        expect(screen.queryByText("Term 1")).not.toBeInTheDocument();
    });
});
