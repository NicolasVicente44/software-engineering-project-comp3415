import { describe, expect, it, vi } from "vitest";
import {
    generateAndSavePlan,
    parseSavedPlan,
    planInputs,
    recalculateSavedPlan,
} from "@/lib/planner/saved-plan";

// a supabase client whose student_courses and student_settings reads return
// the given data, and whose upsert is recorded
const mockSupabase = (
    courses: unknown[],
    settings: unknown = null,
    { coursesError = null, settingsError = null, upsertError = null }: Record<string, unknown> = {}
) => {
    const upsert = vi.fn().mockResolvedValue({ error: upsertError });
    const from = vi.fn((table: string) =>
        table === "student_settings"
            ? {
                  select: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({ data: settings, error: settingsError }),
                      }),
                  }),
                  upsert,
              }
            : {
                  select: vi.fn().mockReturnValue({
                      eq: vi.fn().mockResolvedValue({ data: courses, error: coursesError }),
                  }),
              }
    );

    // only the parts of the client the planner uses
    return { client: { from } as never, upsert };
};

const course = (course_code: string, status: string, prerequisites: string[] = [], credits = 0.5) => ({
    course_name: course_code,
    course_code,
    credits,
    status,
    prerequisites,
});

describe("parseSavedPlan", () => {
    it("reads a saved plan", () => {
        expect(
            parseSavedPlan({
                terms: [{ term: 1, courses: ["COMP-1000"] }],
                creditLimit: 2,
                generatedAt: "2026-11-16",
                unschedulable: [],
            })
        ).toEqual({
            terms: [{ term: 1, courses: ["COMP-1000"] }],
            creditLimit: 2,
            generatedAt: "2026-11-16",
            unschedulable: [],
            lastChange: undefined,
        });
    });

    it.each([null, undefined, "plan", { terms: "nope" }, { terms: [{ term: "1", courses: [] }] }])(
        "returns null for a missing or malformed plan: %j",
        (value) => {
            expect(parseSavedPlan(value)).toBeNull();
        }
    );
});

describe("planInputs", () => {
    it("plans in-progress, failed and dropped courses and counts completed ones as done (us-05)", () => {
        const inputs = planInputs([
            course("COMP-1000", "completed"),
            course("COMP-2000", "in_progress", ["COMP-1000"], 1),
            course("comp-3000", "failed"),
            course("COMP-4000", "dropped"),
        ]);

        expect(inputs.completed).toEqual(["COMP-1000"]);
        expect(inputs.toTake).toEqual(["COMP-2000", "COMP-3000", "COMP-4000"]);
        expect(inputs.prereqMap["COMP-2000"]).toEqual(["COMP-1000"]);
        expect(inputs.credits["COMP-2000"]).toBe(1);
    });
});

describe("generateAndSavePlan", () => {
    it("builds the plan from the student's courses and saves it", async () => {
        const { client, upsert } = mockSupabase(
            [course("COMP-1000", "failed"), course("COMP-2000", "in_progress", ["COMP-1000"])],
            { credit_limit: 2.5, saved_plan: null }
        );

        const result = await generateAndSavePlan(client, "user-1234");

        expect(result.error).toBeNull();
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: "user-1234",
                saved_plan: expect.objectContaining({
                    terms: [
                        { term: 1, courses: ["COMP-1000"] },
                        { term: 2, courses: ["COMP-2000"] },
                    ],
                    creditLimit: 2.5,
                    unschedulable: [],
                }),
            })
        );
    });

    it("does not save when the courses cannot be loaded", async () => {
        const { client, upsert } = mockSupabase([], null, { coursesError: { message: "db" } });

        const result = await generateAndSavePlan(client, "user-1234");

        expect(result.error).toEqual({ message: "db" });
        expect(upsert).not.toHaveBeenCalled();
    });
});

describe("recalculateSavedPlan (us-05)", () => {
    const saved = {
        terms: [
            { term: 1, courses: ["COMP-1000"] },
            { term: 2, courses: ["COMP-2000"] },
        ],
        creditLimit: 2.5,
        generatedAt: "2026-11-16",
        unschedulable: [],
    };

    it("moves the failed course and its dependents, and saves the change", async () => {
        const { client, upsert } = mockSupabase(
            [course("COMP-1000", "failed"), course("COMP-2000", "in_progress", ["COMP-1000"])],
            { credit_limit: 2.5, saved_plan: saved }
        );

        const change = await recalculateSavedPlan(client, "user-1234", "COMP-1000", "failed");

        expect(change).toEqual({
            course: "COMP-1000",
            status: "failed",
            from: 1,
            to: 2,
            moved: [{ code: "COMP-2000", from: 2, to: 3 }],
        });
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                saved_plan: expect.objectContaining({
                    terms: [
                        { term: 1, courses: [] },
                        { term: 2, courses: ["COMP-1000"] },
                        { term: 3, courses: ["COMP-2000"] },
                    ],
                    lastChange: change,
                }),
            })
        );
    });

    it("returns null and saves nothing when there is no saved plan", async () => {
        const { client, upsert } = mockSupabase([course("COMP-1000", "failed")], { credit_limit: 2.5, saved_plan: null });

        expect(await recalculateSavedPlan(client, "user-1234", "COMP-1000", "failed")).toBeNull();
        expect(upsert).not.toHaveBeenCalled();
    });

    it("returns null when the updated plan cannot be saved", async () => {
        const { client } = mockSupabase(
            [course("COMP-1000", "failed")],
            { credit_limit: 2.5, saved_plan: saved },
            { upsertError: { message: "db" } }
        );
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const change = await recalculateSavedPlan(client, "user-1234", "COMP-1000", "failed");
        consoleError.mockRestore();

        expect(change).toBeNull();
    });
});
