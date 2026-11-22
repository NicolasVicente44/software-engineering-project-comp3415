import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePlanningSettings, saveProfileDetails } from "@/lib/settings/actions";

const { createClient, revalidatePath } = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient,
}));

vi.mock("next/cache", () => ({
    revalidatePath,
}));

const mockSupabase = (
    upsertResult: { error: unknown } = { error: null },
    user: { id: string } | null = { id: "user-1234" }
) => {
    const upsert = vi.fn().mockResolvedValue(upsertResult);
    const from = vi.fn().mockReturnValue({ upsert });

    createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user } })
        },
        from
    });

    return { from, upsert };
};

const formWith = (values: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));
    return formData;
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("savePlanningSettings", () => {
    it("saves the credit limit and credits to graduate for the logged in user", async () => {
        const { from, upsert } = mockSupabase();

        const result = await savePlanningSettings(
            {},
            formWith({ credit_limit: "2.5", credits_to_graduate: "20" })
        );

        expect(from).toHaveBeenCalledWith("student_settings");
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({ user_id: "user-1234", credit_limit: 2.5, credits_to_graduate: 20 })
        );
        expect(result).toEqual({ message: "Your planning settings were saved." });
    });

    it("refreshes the plan and dashboard so they use the new values", async () => {
        mockSupabase();

        await savePlanningSettings({}, formWith({ credit_limit: "2" }));

        expect(revalidatePath).toHaveBeenCalledWith("/plan");
        expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("returns an error when the user is not signed in", async () => {
        const { upsert } = mockSupabase({ error: null }, null);

        const result = await savePlanningSettings({}, formWith({ credit_limit: "2.5" }));

        expect(result).toEqual({
            error: "You must be signed in to change your planning settings."
        });
        expect(upsert).not.toHaveBeenCalled();
    });

    it("returns a validation error without saving", async () => {
        const { upsert } = mockSupabase();

        const result = await savePlanningSettings({}, formWith({ credit_limit: "-1" }));

        expect(result).toEqual({
            error: "Credit limit must be a number greater than 0 and at most 10."
        });
        expect(upsert).not.toHaveBeenCalled();
    });

    it("returns an error when the settings cannot be saved", async () => {
        mockSupabase({ error: { message: "Error in database" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await savePlanningSettings({}, formWith({ credit_limit: "2" }));
        consoleError.mockRestore();

        expect(result).toEqual({
            error: "Unable to save your planning settings. Please try again."
        });
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});

describe("saveProfileDetails", () => {
    it("saves the name, school and program for the logged in user", async () => {
        const { upsert } = mockSupabase();

        const result = await saveProfileDetails(
            {},
            formWith({ full_name: " Jane Doe ", school: "Lakehead University", program: "" })
        );

        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: "user-1234",
                full_name: "Jane Doe",
                school: "Lakehead University",
                program: null
            })
        );
        expect(result).toEqual({ message: "Your profile was saved." });
    });

    it("does not touch the planning settings", async () => {
        const { upsert } = mockSupabase();

        await saveProfileDetails({}, formWith({ full_name: "Jane" }));

        expect(upsert.mock.calls[0][0]).not.toHaveProperty("credit_limit");
    });

    it("returns a validation error without saving", async () => {
        const { upsert } = mockSupabase();

        const result = await saveProfileDetails({}, formWith({ school: "x".repeat(101) }));

        expect(result).toEqual({ error: "School must be at most 100 characters." });
        expect(upsert).not.toHaveBeenCalled();
    });

    it("returns an error when the profile cannot be saved", async () => {
        mockSupabase({ error: { message: "Error in database" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await saveProfileDetails({}, formWith({ full_name: "Jane" }));
        consoleError.mockRestore();

        expect(result).toEqual({ error: "Unable to save your profile. Please try again." });
    });
});
