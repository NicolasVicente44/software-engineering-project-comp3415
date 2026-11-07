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

        const page = await CoursesView({ searchParams: Promise.resolve({}) });
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

        const page = await CoursesView({ searchParams: Promise.resolve({}) });
        render(page);

        expect(
            screen.getByText("Unable to load your courses. Please try again.")
        ).toBeInTheDocument();
    });

    describe("added course message", () => {
        // logged in user with one course and no db error
        function mockLoadedCourses() {
            createClient.mockResolvedValue({
                auth: {
                    getUser: vi.fn().mockResolvedValue({
                        data: {
                            user: {
                                id: "user-1234"
                            }
                        }
                    }),
                },
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            data: [course],
                            error: null
                        }),
                    }),
                }),
            });
        }

        it("shows the success message when a course was added", async () => {
            mockLoadedCourses();

            const page = await CoursesView({ searchParams: Promise.resolve({ added: "COMP-3415" }) });
            render(page);

            expect(
                screen.getByText("COMP-3415 was added to your courses.")
            ).toBeInTheDocument();
        });

        it("shows no message when added is missing", async () => {
            mockLoadedCourses();

            const page = await CoursesView({ searchParams: Promise.resolve({}) });
            render(page);

            expect(screen.queryByText(/was added to your courses/)).not.toBeInTheDocument();
            expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        });

        it("shows no message when added is not a valid course code", async () => {
            mockLoadedCourses();

            const page = await CoursesView({ searchParams: Promise.resolve({ added: "hello" }) });
            render(page);

            expect(screen.queryByText(/was added to your courses/)).not.toBeInTheDocument();
            expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        });
    });
});