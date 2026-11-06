import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveCreditLimit } from "@/lib/settings/actions";

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

const formWith = (creditLimit?: string) => {
    const formData = new FormData();
    if (creditLimit !== undefined) {
        formData.set("credit_limit", creditLimit);
    }
    return formData;
};

describe("saveCreditLimit", () => {
    beforeEach(() => {
        redirect.mockReset();
    });

    it("saves the limit for the logged in user and regenerates the plan", async () => {
        const { from, upsert } = mockSupabase();

        await saveCreditLimit({}, formWith("2.5"));

        expect(from).toHaveBeenCalledWith("student_settings");
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({ user_id: "user-1234", credit_limit: 2.5 })
        );
        expect(redirect).toHaveBeenCalledWith("/plan?generate=1");
    });

    it("returns an error when the user is not signed in", async () => {
        const { upsert } = mockSupabase({ error: null }, null);

        const result = await saveCreditLimit({}, formWith("2.5"));

        expect(result).toEqual({
            error: "You must be signed in to change your credit limit."
        });
        expect(upsert).not.toHaveBeenCalled();
    });

    it("returns an error when the limit is missing", async () => {
        const { upsert } = mockSupabase();

        expect(await saveCreditLimit({}, formWith())).toEqual({
            error: "Credit limit is required."
        });
        expect(await saveCreditLimit({}, formWith("  "))).toEqual({
            error: "Credit limit is required."
        });
        expect(upsert).not.toHaveBeenCalled();
    });

    it.each(["0", "-1", "abc", "10.5"])("rejects an invalid limit of %s", async (value) => {
        const { upsert } = mockSupabase();

        const result = await saveCreditLimit({}, formWith(value));

        expect(result).toEqual({
            error: "Credit limit must be a number greater than 0 and at most 10."
        });
        expect(upsert).not.toHaveBeenCalled();
        expect(redirect).not.toHaveBeenCalled();
    });

    it("returns an error when the limit cannot be saved", async () => {
        mockSupabase({ error: { message: "Error in database" } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await saveCreditLimit({}, formWith("2"));
        consoleError.mockRestore();

        expect(result).toEqual({
            error: "Unable to save your credit limit. Please try again."
        });
        expect(redirect).not.toHaveBeenCalled();
    });
});
