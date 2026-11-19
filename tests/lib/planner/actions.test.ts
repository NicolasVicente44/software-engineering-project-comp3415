import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePlanAction } from "@/lib/planner/actions";

const { createClient, redirect, generateAndSavePlan } = vi.hoisted(() => ({
    createClient: vi.fn(),
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    generateAndSavePlan: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/planner/saved-plan", () => ({ generateAndSavePlan }));

const signedIn = (user: { id: string } | null = { id: "user-1234" }) =>
    createClient.mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    });

describe("generatePlanAction (us-05)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("saves a new plan and shows it", async () => {
        signedIn();
        generateAndSavePlan.mockResolvedValue({ error: null });

        await expect(generatePlanAction()).rejects.toThrow("NEXT_REDIRECT:/plan");

        expect(generateAndSavePlan).toHaveBeenCalledWith(expect.anything(), "user-1234");
    });

    it("shows an error when the plan cannot be saved", async () => {
        signedIn();
        generateAndSavePlan.mockResolvedValue({ error: { message: "db" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(generatePlanAction()).rejects.toThrow("NEXT_REDIRECT:/plan?error=generate");
        consoleError.mockRestore();
    });

    it("sends a signed-out user to login", async () => {
        signedIn(null);

        await expect(generatePlanAction()).rejects.toThrow("NEXT_REDIRECT:/login");

        expect(generateAndSavePlan).not.toHaveBeenCalled();
    });
});
