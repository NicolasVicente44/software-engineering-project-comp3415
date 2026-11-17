import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfilePage from "@/app/profile/page";

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

// the navbar has its own server action; it is not under test here
vi.mock("@/components/navbar", () => ({
    Navbar: () => <nav />,
}));

const mockSupabase = (
    settings: { data: unknown; error: unknown } = { data: null, error: null },
    user: { id: string; email: string } | null = { id: "user-1234", email: "student@example.com" }
) => {
    const maybeSingle = vi.fn().mockResolvedValue(settings);
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user } })
        },
        from
    });

    return { from, eq };
};

describe("ProfilePage (us-11)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to login when the user is not signed in", async () => {
        mockSupabase(undefined, null);

        await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("shows the student's saved profile and planning settings", async () => {
        const { from, eq } = mockSupabase({
            data: {
                full_name: "Jane Doe",
                school: "Lakehead University",
                program: "Computer Science",
                credit_limit: 2,
                credits_to_graduate: 20,
            },
            error: null,
        });

        render(await ProfilePage());

        expect(from).toHaveBeenCalledWith("student_settings");
        expect(eq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe");
        expect(screen.getByLabelText("School")).toHaveValue("Lakehead University");
        expect(screen.getByLabelText("Program")).toHaveValue("Computer Science");
        expect(screen.getByLabelText("Credit limit per term")).toHaveValue(2);
        expect(screen.getByLabelText("Credits needed to graduate")).toHaveValue(20);
        expect(screen.getByText("student@example.com")).toBeInTheDocument();
    });

    it("uses the default credit limit for a student with no saved settings", async () => {
        mockSupabase();

        render(await ProfilePage());

        expect(screen.getByLabelText("Name")).toHaveValue("");
        expect(screen.getByLabelText("Credit limit per term")).toHaveValue(2.5);
        expect(screen.getByLabelText("Credits needed to graduate")).toHaveValue(null);
    });

    it("shows an error but still allows account changes when the profile cannot be loaded", async () => {
        mockSupabase({ data: null, error: { message: "Error in database" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        render(await ProfilePage());
        consoleError.mockRestore();

        expect(screen.getByText("Unable to load your profile. Please try again.")).toBeInTheDocument();
        expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Change Email" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
    });
});
