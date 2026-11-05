import { describe, expect, it } from "vitest";
import {
  DEFAULT_COURSE_CREDITS,
  generatePlan,
} from "@/lib/planner/generate-plan";

// A -> B -> C chain, plus an independent course D
const MAP = {
  "COMP-3000": ["COMP-2000"],
  "COMP-2000": ["COMP-1000"],
};
const REQUIRED = ["COMP-1000", "COMP-2000", "COMP-3000", "COMP-4000"];

const allCourses = (terms: { courses: string[] }[]) =>
  terms.flatMap((t) => t.courses);

describe("generatePlan", () => {
  it("AC1: every remaining required course appears in exactly one term", () => {
    const { terms } = generatePlan(["COMP-1000"], REQUIRED, MAP);
    const placed = allCourses(terms);

    expect([...placed].sort()).toEqual(["COMP-2000", "COMP-3000", "COMP-4000"]);
    expect(new Set(placed).size).toBe(placed.length);
  });

  it("AC2: places a course in a later term than its prerequisite", () => {
    const { terms } = generatePlan([], REQUIRED, MAP);
    const termOf = (code: string) =>
      terms.find((t) => t.courses.includes(code))!.term;

    expect(termOf("COMP-2000")).toBeGreaterThan(termOf("COMP-1000"));
    expect(termOf("COMP-3000")).toBeGreaterThan(termOf("COMP-2000"));
  });

  it("AC3: reports that requirements are complete when nothing remains", () => {
    const result = generatePlan(REQUIRED, REQUIRED, MAP);

    expect(result).toEqual({ terms: [], complete: true, unschedulable: [], overLimit: [] });
  });

  it("puts courses with no unmet prerequisites together in the first term", () => {
    const { terms } = generatePlan([], REQUIRED, MAP);

    expect(terms[0]).toEqual({ term: 1, courses: ["COMP-1000", "COMP-4000"] });
  });

  it("skips completed courses and starts from what is unlocked", () => {
    const { terms } = generatePlan(["COMP-1000", "COMP-2000"], REQUIRED, MAP);

    expect(terms).toEqual([{ term: 1, courses: ["COMP-3000", "COMP-4000"] }]);
  });

  it("matches completed courses regardless of code format", () => {
    const { terms } = generatePlan(["comp1000", "Comp_2000"], REQUIRED, MAP);

    expect(allCourses(terms)).not.toContain("COMP-1000");
    expect(allCourses(terms)).not.toContain("COMP-2000");
  });

  it("adds a missing prerequisite that is not in the required list", () => {
    const { terms } = generatePlan([], ["COMP-3000"], MAP);

    expect(terms.map((t) => t.courses)).toEqual([
      ["COMP-1000"],
      ["COMP-2000"],
      ["COMP-3000"],
    ]);
  });

  it("reports circular prerequisites instead of looping forever", () => {
    const result = generatePlan([], ["COMP-1000"], {
      "COMP-1000": ["COMP-2000"],
      "COMP-2000": ["COMP-1000"],
    });

    expect(result.complete).toBe(false);
    expect(result.terms).toEqual([]);
    expect(result.unschedulable).toEqual(["COMP-1000", "COMP-2000"]);
  });

  it("places a diamond dependency after both of its prerequisites", () => {
    const { terms } = generatePlan([], ["D"], {
      D: ["B", "C"],
      B: ["A"],
      C: ["A"],
    });

    expect(terms.map((t) => t.courses)).toEqual([["A"], ["B", "C"], ["D"]]);
  });

  it("places a course once when the required list has duplicates or variant codes", () => {
    const { terms } = generatePlan([], ["comp1000", "COMP-1000", "Comp_1000"], {});

    expect(terms).toEqual([{ term: 1, courses: ["COMP-1000"] }]);
  });

  it("reports a course that lists itself as a prerequisite", () => {
    const result = generatePlan([], ["COMP-1000"], { "COMP-1000": ["COMP-1000"] });

    expect(result.terms).toEqual([]);
    expect(result.unschedulable).toEqual(["COMP-1000"]);
  });

  it("keeps the valid terms when only part of the plan is circular", () => {
    const result = generatePlan([], ["COMP-1000", "COMP-2000", "COMP-3000"], {
      "COMP-2000": ["COMP-3000"],
      "COMP-3000": ["COMP-2000"],
    });

    expect(result.terms).toEqual([{ term: 1, courses: ["COMP-1000"] }]);
    expect(result.unschedulable).toEqual(["COMP-2000", "COMP-3000"]);
  });

  it("matches prerequisite map keys regardless of code format", () => {
    const { terms } = generatePlan([], ["COMP-2000"], { comp2000: ["COMP-1000"] });

    expect(terms.map((t) => t.courses)).toEqual([["COMP-1000"], ["COMP-2000"]]);
  });

  it("reports nothing to plan when the student has no courses to take", () => {
    expect(generatePlan(["COMP-1000"], [], MAP)).toEqual({
      terms: [],
      complete: true,
      unschedulable: [],
      overLimit: [],
    });
  });

  it("uses the program's prerequisites by default", () => {
    const { terms, complete } = generatePlan([], ["COMP-3415"]);
    const placed = allCourses(terms);

    expect(complete).toBe(false);
    expect(placed).toContain("COMP-3415");
    const termOf = (code: string) =>
      terms.find((t) => t.courses.includes(code))!.term;
    expect(termOf("COMP-3415")).toBeGreaterThan(termOf("COMP-2412"));
    expect(termOf("COMP-3415")).toBeGreaterThan(termOf("COMP-2477"));
  });
});

// independent courses (no prerequisites) worth 1.0 credits each
const FULL = { "COMP-1000": 1, "COMP-2000": 1, "COMP-3000": 1, "COMP-4000": 1 };
const termCredits = (courses: string[], credits: Record<string, number>) =>
  courses.reduce((sum, code) => sum + (credits[code] ?? DEFAULT_COURSE_CREDITS), 0);

describe("generatePlan with a credit limit (us-06)", () => {
  it("AC1: no term has more credits than the limit", () => {
    const credits = { ...FULL, "COMP-1500": 0.5, "COMP-2500": 0.5 };
    const { terms } = generatePlan([], Object.keys(credits), {}, {
      creditLimit: 2.5,
      credits,
    });

    for (const term of terms) {
      expect(termCredits(term.courses, credits)).toBeLessThanOrEqual(2.5);
    }
    expect(allCourses(terms)).toHaveLength(6);
  });

  it("AC2: moves a ready course to the next term once the limit is reached", () => {
    const { terms } = generatePlan([], Object.keys(FULL), {}, {
      creditLimit: 2,
      credits: FULL,
    });

    expect(terms.map((t) => t.courses)).toEqual([
      ["COMP-1000", "COMP-2000"],
      ["COMP-3000", "COMP-4000"],
    ]);
  });

  it("AC2: fills leftover room with a smaller course that still fits", () => {
    const credits = { "COMP-1000": 1, "COMP-2000": 1, "COMP-3000": 0.5 };
    const { terms } = generatePlan([], Object.keys(credits), {}, {
      creditLimit: 1.5,
      credits,
    });

    expect(terms.map((t) => t.courses)).toEqual([
      ["COMP-1000", "COMP-3000"],
      ["COMP-2000"],
    ]);
  });

  it("AC3: every term is at or under a lowered limit", () => {
    const required = Object.keys(FULL);
    const before = generatePlan([], required, {}, { creditLimit: 4, credits: FULL });
    const after = generatePlan([], required, {}, { creditLimit: 1, credits: FULL });

    expect(before.terms).toHaveLength(1);
    expect(after.terms).toHaveLength(4);
    for (const term of after.terms) {
      expect(termCredits(term.courses, FULL)).toBeLessThanOrEqual(1);
    }
  });

  it("still places a course after its prerequisites under a limit", () => {
    const { terms } = generatePlan([], REQUIRED, MAP, {
      creditLimit: 1,
      credits: FULL,
    });
    const termOf = (code: string) =>
      terms.find((t) => t.courses.includes(code))!.term;

    expect(termOf("COMP-2000")).toBeGreaterThan(termOf("COMP-1000"));
    expect(termOf("COMP-3000")).toBeGreaterThan(termOf("COMP-2000"));
    expect(allCourses(terms).sort()).toEqual(REQUIRED);
  });

  it("allows a term to land exactly on the limit despite rounding", () => {
    const credits = { "COMP-1000": 0.1, "COMP-2000": 0.2, "COMP-3000": 0.3 };
    const { terms } = generatePlan([], Object.keys(credits), {}, {
      creditLimit: 0.6,
      credits,
    });

    expect(terms).toHaveLength(1);
  });

  it("uses the default credits for a course with no known credit value", () => {
    const { terms } = generatePlan([], ["COMP-1000", "COMP-2000"], {}, {
      creditLimit: DEFAULT_COURSE_CREDITS,
    });

    expect(terms.map((t) => t.courses)).toEqual([["COMP-1000"], ["COMP-2000"]]);
  });

  it("matches credit keys regardless of code format", () => {
    const { terms } = generatePlan([], ["COMP-1000", "COMP-2000"], {}, {
      creditLimit: 1,
      credits: { comp1000: 1, Comp_2000: 1 },
    });

    expect(terms).toHaveLength(2);
  });

  it("gives a course over the limit a term of its own and reports it", () => {
    const credits = { "COMP-1000": 0.5, "COMP-2000": 2, "COMP-3000": 0.5 };
    const result = generatePlan([], Object.keys(credits), {}, {
      creditLimit: 1,
      credits,
    });

    expect(result.terms.map((t) => t.courses)).toEqual([
      ["COMP-1000", "COMP-3000"],
      ["COMP-2000"],
    ]);
    expect(result.overLimit).toEqual(["COMP-2000"]);
  });

  it("has no limit when none is given", () => {
    const { terms, overLimit } = generatePlan([], Object.keys(FULL), {}, {
      credits: FULL,
    });

    expect(terms).toHaveLength(1);
    expect(overLimit).toEqual([]);
  });
});
