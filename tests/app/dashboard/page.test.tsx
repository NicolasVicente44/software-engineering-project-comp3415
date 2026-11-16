import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";

const { createClient, redirect } = vi.hoisted(() => ({
    createClient: vi.fn(),
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient,
}));

vi.mock("next/navigation", () => ({
    redirect,
}));

vi.mock("@/components/navbar", () => ({
    Navbar: () => <nav />,
}));

const mockSupabase = (
    settings: unknown,
    completed: unknown[] = []
) => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: settings, error: null });
    const statusEq = vi.fn().mockResolvedValue({ data: completed, error: null });
    const from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(
                table === "student_settings" ? { maybeSingle } : { eq: statusEq }
            ),
        }),
    }));

    createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "user-1234", email: "student@example.com" } }
            })
        },
        from
    });

    return { from, statusEq };
};

describe("DashboardPage progress to graduation (us-11)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows completed credits out of the credits to graduate", async () => {
        const { statusEq } = mockSupabase(
            { full_name: "Jane Doe", credits_to_graduate: 20 },
            [{ credits: 1 }, { credits: 0.5 }, { credits: null }]
        );

        render(await DashboardPage());

        expect(statusEq).toHaveBeenCalledWith("status", "completed");
        expect(screen.getByText("Welcome, Jane Doe")).toBeInTheDocument();
        // a course with no credit value counts as the default 0.5
        expect(screen.getByText(/credits completed/)).toHaveTextContent("2 of 20 credits completed (10%)");
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("asks the student to set credits to graduate when it is not set", async () => {
        const { from } = mockSupabase({ full_name: null, credits_to_graduate: null });

        render(await DashboardPage());

        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        expect(from).not.toHaveBeenCalledWith("student_courses");
    });

    it("caps progress at 100% when more credits are completed than needed", async () => {
        mockSupabase({ full_name: null, credits_to_graduate: 1 }, [{ credits: 1 }, { credits: 1 }]);

        render(await DashboardPage());

        expect(screen.getByText(/credits completed/)).toHaveTextContent("2 of 1 credits completed (100%)");
    });
});
