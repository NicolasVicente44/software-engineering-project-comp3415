import { describe, expect, it, vi } from "vitest";
import { render, screen} from "@testing-library/react"
import CoursesView from "@/app/courses/page";

const course = {
    id: "1234",
    user_id: "user-1234",
    course_name: "Software Engineering",
    course_code: "COMP-4312",
    credits: 1,
    status: "completed" as const,
    created_at: "2026-10-24",
};

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

describe("CoursesView", () => {
    it("loads and displays courses for the logged in user", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        const eq = vi.fn().mockResolvedValue({
            data: [course],
            error: null
        });

        const select = vi.fn().mockReturnValue({
            eq,
        });

        const from = vi.fn().mockReturnValue({
            select,
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
            from,
        });

        const page = await CoursesView();
        render(page);

        expect(from).toHaveBeenCalledWith("student_courses");
        expect(select).toHaveBeenCalledWith("*");
        expect(eq).toHaveBeenCalledWith("user_id", "user-1234");

        expect(screen.getByText("Software Engineering")).toBeInTheDocument();
    });

    it("displays error when database read has failed", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        const eq = vi.fn().mockResolvedValue({
            data: null,
            error: {
                message: "Error in database"
            }
        });

        const select = vi.fn().mockReturnValue({
            eq,
        });

        const from = vi.fn().mockReturnValue({
            select,
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
            from,
        });

        const page = await CoursesView();
        render(page);

        expect(
            screen.getByText("Unable to load your courses. Please try again.")
        ).toBeInTheDocument();
    });
});