import { describe, expect, it, vi } from "vitest";
import EditCourse from "@/app/courses/[id]/edit/page";

const { createClient, redirect } = vi.hoisted(() => ({
    createClient: vi.fn(),
    redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient,
}));

vi.mock("next/navigation", () => ({
    redirect: (path: string) => {
        redirect(path);
        throw new Error("NEXT_REDIRECT");
    },
}));

describe("EditCourse", () => {
    it("redirects to login when the user is not signed in", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: null
            }
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
        });

        await expect(
            EditCourse({
                params: Promise.resolve({ id: "course-123" })
            })
        ).rejects.toThrow("NEXT_REDIRECT");

        expect(redirect).toHaveBeenCalledWith("/login");
    });
});