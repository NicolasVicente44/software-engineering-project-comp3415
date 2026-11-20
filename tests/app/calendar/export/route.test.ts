import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

import { GET } from "@/app/calendar/export/route";

const mockSupabase = (
  courses: { data: unknown; error: unknown },
  settings: { data: unknown; error: unknown } = { data: null, error: null },
  user: { id: string } | null = { id: "user-1234" },
) => {
  const eq = vi.fn().mockResolvedValue(courses);
  const select = vi.fn().mockReturnValue({ eq });
  const maybeSingle = vi.fn().mockResolvedValue(settings);
  const settingsEq = vi.fn().mockReturnValue({ maybeSingle });
  const settingsSelect = vi.fn().mockReturnValue({ eq: settingsEq });
  const from = vi.fn((table: string) =>
    table === "student_settings" ? { select: settingsSelect } : { select },
  );

  createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  });

  return { from, eq, settingsSelect, settingsEq };
};

const course = (course_code: string, status = "in_progress") => ({
  course_code,
  course_name: `${course_code} name`,
  credits: 0.5,
  status,
  prerequisites: [],
});

const savedPlan = (terms: { term: number; courses: string[] }[]) => ({
  data: {
    credit_limit: 2.5,
    saved_plan: { terms, creditLimit: 2.5, generatedAt: "2026-11-16T00:00:00Z", unschedulable: [] },
  },
  error: null,
});

const COURSES = {
  data: [course("COMP-2477"), course("COMP-3415"), course("COMP-4411", "failed")],
  error: null,
};

const DB_ERROR = { data: null, error: { message: "Error in database" } };

describe("GET /calendar/export (us-10)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 20, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when there is no user", async () => {
    const { from } = mockSupabase(COURSES, undefined, null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ["courses", DB_ERROR, savedPlan([{ term: 1, courses: ["COMP-2477"] }])],
    ["saved plan", COURSES, DB_ERROR],
  ])("returns 500 when the %s cannot be loaded", async (_, courses, settings) => {
    mockSupabase(courses, settings);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();
    consoleError.mockRestore();

    expect(response.status).toBe(500);
  });

  it("returns 404 when there is no saved plan", async () => {
    mockSupabase(COURSES);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("No saved plan");
  });

  it("AC3: returns the saved plan as an .ics download", async () => {
    const { eq, settingsSelect, settingsEq } = mockSupabase(
      COURSES,
      savedPlan([
        { term: 1, courses: ["COMP-2477"] },
        { term: 2, courses: ["COMP-3415"] },
      ]),
    );

    const response = await GET();
    const body = await response.text();

    expect(eq).toHaveBeenCalledWith("user_id", "user-1234");
    expect(settingsSelect).toHaveBeenCalledWith("credit_limit, saved_plan");
    expect(settingsEq).toHaveBeenCalledWith("user_id", "user-1234");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="gradpath-plan.ics"',
    );
    expect(body).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(body).toContain("SUMMARY:COMP-2477\r\n");
    expect(body).toContain("DESCRIPTION:Term 1 · Winter 2027\r\n");
    expect(body).toContain("SUMMARY:COMP-3415\r\n");
    expect(body).toContain("DESCRIPTION:Term 2 · Fall 2027\r\n");
    // only the saved plan is exported, not a freshly generated one (us-10)
    expect(body).not.toContain("COMP-4411");
  });

  it("AC2: a different saved plan gives a different file", async () => {
    mockSupabase(COURSES, savedPlan([{ term: 1, courses: ["COMP-2477", "COMP-3415"] }]));
    const before = await (await GET()).text();

    // e.g. after COMP-2477 is failed and the plan is recalculated (us-05)
    mockSupabase(
      COURSES,
      savedPlan([
        { term: 1, courses: [] },
        { term: 2, courses: ["COMP-2477"] },
        { term: 3, courses: ["COMP-3415"] },
      ]),
    );
    const after = await (await GET()).text();

    expect(before).toContain("DESCRIPTION:Term 1 · Winter 2027\r\n");
    expect(before).not.toContain("Fall 2027");
    expect(after).toContain("DESCRIPTION:Term 2 · Fall 2027\r\n");
    expect(after).toContain("DESCRIPTION:Term 3 · Winter 2028\r\n");
    expect(after).toContain("SUMMARY:Winter 2027 starts\r\n");
    expect(after).not.toContain("DESCRIPTION:Term 1");
  });

  it("returns a calendar with no events for an empty saved plan", async () => {
    mockSupabase(COURSES, savedPlan([]));

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("BEGIN:VCALENDAR\r\n");
    expect(body).not.toContain("BEGIN:VEVENT");
  });
});
