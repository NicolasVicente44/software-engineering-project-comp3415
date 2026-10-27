import { describe, expect, it } from "vitest";
import {
  checkPrerequisites,
  normalizeCourseCode,
} from "@/lib/prerequisites/check";

const MAP = { "COMP-3000": ["COMP-1000", "COMP-2000"] };

describe("normalizeCourseCode", () => {
  it.each([
    "COMP-3000",
    "comp-3000",
    "comp 3000",
    "COMP3000",
    "  Comp-3000 ",
    "comp_3000",
  ])("normalizes %j to COMP-3000", (raw) => {
    expect(normalizeCourseCode(raw)).toBe("COMP-3000");
  });
});

describe("checkPrerequisites", () => {
  it("AC1: returns the required prerequisites of a course", () => {
    const result = checkPrerequisites("COMP-3000", [], MAP);
    expect(result.required).toEqual(["COMP-1000", "COMP-2000"]);
  });

  it("AC2: accepts a course when all prerequisites are completed", () => {
    const result = checkPrerequisites(
      "COMP-3000",
      [
        { course_code: "COMP-1000", status: "completed" },
        { course_code: "COMP-2000", status: "completed" },
      ],
      MAP,
    );
    expect(result.eligible).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("AC3: blocks a course when a prerequisite is missing", () => {
    const result = checkPrerequisites(
      "COMP-3000",
      [{ course_code: "COMP-1000", status: "completed" }],
      MAP,
    );
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(["COMP-2000"]);
  });

  it("matches course codes regardless of format", () => {
    const result = checkPrerequisites(
      "comp3000",
      [
        { course_code: "comp-1000", status: "completed" },
        { course_code: "Comp_2000", status: "completed" },
      ],
      MAP,
    );
    expect(result).toEqual({
      eligible: true,
      required: ["COMP-1000", "COMP-2000"],
      missing: [],
    });
  });

  it.each(["in_progress", "failed", "dropped"])(
    "rejects a prerequisite with status %s",
    (status) => {
      const result = checkPrerequisites(
        "COMP-3000",
        [
          { course_code: "COMP-1000", status: "completed" },
          { course_code: "COMP-2000", status },
        ],
        MAP,
      );
      expect(result.eligible).toBe(false);
      expect(result.missing).toEqual(["COMP-2000"]);
    },
  );

  it("returns no prerequisites for a course not in the map", () => {
    expect(checkPrerequisites("COMP-9999", [], MAP)).toEqual({
      eligible: true,
      required: [],
      missing: [],
    });
  });
});
