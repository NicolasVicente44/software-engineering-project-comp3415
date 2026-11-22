import { describe, expect, it } from "vitest";
import { parsePlanningSettings, parseProfileDetails } from "@/lib/settings/validation";

const formWith = (values: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));
    return formData;
};

describe("parsePlanningSettings", () => {
    it("reads the credit limit and credits to graduate", () => {
        expect(parsePlanningSettings(formWith({ credit_limit: "2.5", credits_to_graduate: "20" }))).toEqual({
            ok: true,
            value: { credit_limit: 2.5, credits_to_graduate: 20 }
        });
    });

    it("treats an empty credits to graduate as not set", () => {
        expect(parsePlanningSettings(formWith({ credit_limit: "2", credits_to_graduate: " " }))).toEqual({
            ok: true,
            value: { credit_limit: 2, credits_to_graduate: null }
        });
    });

    it("requires a credit limit", () => {
        expect(parsePlanningSettings(formWith({}))).toEqual({ ok: false, error: "Credit limit is required." });
        expect(parsePlanningSettings(formWith({ credit_limit: "  " }))).toEqual({
            ok: false,
            error: "Credit limit is required."
        });
    });

    it.each(["0", "-1", "abc", "10.5"])("rejects a credit limit of %s", (value) => {
        expect(parsePlanningSettings(formWith({ credit_limit: value }))).toEqual({
            ok: false,
            error: "Credit limit must be a number greater than 0 and at most 10."
        });
    });

    it.each(["0", "-5", "abc", "101"])("rejects credits to graduate of %s", (value) => {
        expect(parsePlanningSettings(formWith({ credit_limit: "2", credits_to_graduate: value }))).toEqual({
            ok: false,
            error: "Credits to graduate must be a number greater than 0 and at most 100."
        });
    });
});

describe("parseProfileDetails", () => {
    it("trims the values and saves empty fields as null", () => {
        expect(parseProfileDetails(formWith({ full_name: "  Jane Doe ", school: "", program: "CS" }))).toEqual({
            ok: true,
            value: { full_name: "Jane Doe", school: null, program: "CS" }
        });
    });

    it("treats missing fields as null", () => {
        expect(parseProfileDetails(formWith({}))).toEqual({
            ok: true,
            value: { full_name: null, school: null, program: null }
        });
    });

    it.each([
        ["full_name", "Name"],
        ["school", "School"],
        ["program", "Program"],
    ])("rejects a %s longer than 100 characters", (field, label) => {
        expect(parseProfileDetails(formWith({ [field]: "x".repeat(101) }))).toEqual({
            ok: false,
            error: `${label} must be at most 100 characters.`
        });
    });
});
