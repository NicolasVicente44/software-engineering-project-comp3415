import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

import { GET } from "@/app/calendar/export/route";

const mockSupabase = (
  result: { data: unknown; error: unknown },
  user: { id: string } | null = { id: "user-1234" },
) => {
  const eq = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq });
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const settingsSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) });
  const from = vi.fn((table: string) =>
    table === "student_settings" ? { select: settingsSelect } : { select },
  );

  createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  });

  return { from, eq };
};

describe("GET /calendar/export (us-10)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 16, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when there is no user", async () => {
    const { from } = mockSupabase({ data: [], error: null }, null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 500 when the plan cannot be loaded", async () => {
    mockSupabase({ data: null, error: { message: "Error in database" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();
    consoleError.mockRestore();

    expect(response.status).toBe(500);
  });

  it("returns the plan as an .ics download", async () => {
    mockSupabase({ data: [{ course_code: "COMP-2477", status: "in_progress" }], error: null });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="gradpath-plan.ics"',
    );
  });

  it("AC3: includes the planned courses in their terms", async () => {
    const { eq } = mockSupabase({
      data: [
        { course_code: "COMP-1411", status: "completed" },
        { course_code: "COMP-2477", status: "in_progress" },
        { course_code: "COMP-3415", status: "in_progress", prerequisites: ["COMP-2477"] },
      ],
      error: null,
    });

    const body = await (await GET()).text();

    expect(eq).toHaveBeenCalledWith("user_id", "user-1234");
    expect(body).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(body).toContain("SUMMARY:COMP-2477\r\n");
    expect(body).toContain("SUMMARY:COMP-3415\r\n");
    expect(body).toContain("DESCRIPTION:Term 1 · Winter 2027\r\n");
    expect(body).toContain("DESCRIPTION:Term 2 · Fall 2027\r\n");
    expect(body).not.toContain("COMP-1411");
  });

  it("AC2: the file changes when the planned courses change", async () => {
    mockSupabase({ data: [{ course_code: "COMP-2477", status: "in_progress" }], error: null });
    const before = await (await GET()).text();

    mockSupabase({ data: [{ course_code: "COMP-4411", status: "failed" }], error: null });
    const after = await (await GET()).text();

    expect(before).toContain("SUMMARY:COMP-2477\r\n");
    expect(after).toContain("SUMMARY:COMP-4411\r\n");
    expect(after).not.toContain("COMP-2477");
  });

  it("returns a calendar with no events when there is nothing to plan", async () => {
    mockSupabase({ data: [], error: null });

    const body = await (await GET()).text();

    expect(body).toContain("BEGIN:VCALENDAR\r\n");
    expect(body).not.toContain("BEGIN:VEVENT");
  });
});
