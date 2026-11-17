import { describe, expect, it, vi } from "vitest";
import { loadPlan } from "@/lib/planner/load-plan";

const mockSupabase = (
  result: { data: unknown; error: unknown },
  settings: { data: unknown; error: unknown } = { data: null, error: null },
) => {
  const eq = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq });
  const maybeSingle = vi.fn().mockResolvedValue(settings);
  const settingsEq = vi.fn().mockReturnValue({ maybeSingle });
  const settingsSelect = vi.fn().mockReturnValue({ eq: settingsEq });
  const from = vi.fn((table: string) =>
    table === "student_settings" ? { select: settingsSelect } : { select },
  );

  return { supabase: { from } as never, from, eq, settingsEq };
};

const course = (course_code: string, status: string, extra = {}) => ({
  course_code,
  status,
  ...extra,
});

describe("loadPlan", () => {
  it("loads the student's courses and settings by user id", async () => {
    const { supabase, from, eq, settingsEq } = mockSupabase({ data: [], error: null });

    await loadPlan(supabase, "user-1234");

    expect(from).toHaveBeenCalledWith("student_courses");
    expect(from).toHaveBeenCalledWith("student_settings");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1234");
    expect(settingsEq).toHaveBeenCalledWith("user_id", "user-1234");
  });

  it("plans in progress and failed courses after their prerequisites", async () => {
    const { supabase } = mockSupabase({
      data: [
        course("COMP-1411", "completed"),
        course("COMP-2477", "in_progress"),
        course("COMP-3415", "failed", { prerequisites: ["comp 2477"] }),
        course("COMP-1431", "dropped"),
      ],
      error: null,
    });

    const { plan, error } = await loadPlan(supabase, "user-1234");

    expect(error).toBe(false);
    expect(plan?.terms).toEqual([
      { term: 1, courses: ["COMP-2477"] },
      { term: 2, courses: ["COMP-3415"] },
    ]);
  });

  it("uses the default credit limit when none is saved", async () => {
    const { supabase } = mockSupabase({ data: [], error: null });

    const { creditLimit, plan } = await loadPlan(supabase, "user-1234");

    expect(creditLimit).toBe(2.5);
    expect(plan?.complete).toBe(true);
  });

  it("keeps terms within the saved credit limit using course credits", async () => {
    const { supabase } = mockSupabase(
      {
        data: [
          course("COMP-1000", "in_progress", { credits: 1 }),
          course("COMP-2000", "in_progress", { credits: 1 }),
          course("COMP-3000", "in_progress", { credits: null }),
        ],
        error: null,
      },
      { data: { credit_limit: 1 }, error: null },
    );

    const { creditLimit, plan } = await loadPlan(supabase, "user-1234");

    expect(creditLimit).toBe(1);
    expect(plan?.terms.map((term) => term.courses)).toEqual([
      ["COMP-1000"],
      ["COMP-2000"],
      ["COMP-3000"],
    ]);
  });

  it("returns an error and no plan when the courses cannot be loaded", async () => {
    const { supabase } = mockSupabase({ data: null, error: { message: "Error in database" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await loadPlan(supabase, "user-1234");
    consoleError.mockRestore();

    expect(result).toEqual({ plan: null, creditLimit: 2.5, error: true });
  });

  it("returns an error and no plan when the credit limit cannot be loaded", async () => {
    const { supabase } = mockSupabase(
      { data: [course("COMP-1000", "in_progress")], error: null },
      { data: null, error: { message: "Error in database" } },
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await loadPlan(supabase, "user-1234");
    consoleError.mockRestore();

    expect(result.error).toBe(true);
    expect(result.plan).toBeNull();
  });
});
