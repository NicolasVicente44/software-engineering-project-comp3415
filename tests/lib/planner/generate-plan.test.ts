import { describe, expect, it } from "vitest";
import { generatePlan } from "@/lib/planner/generate-plan";

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

    expect(result).toEqual({ terms: [], complete: true, unschedulable: [] });
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

  it("uses the program's required courses and prerequisites by default", () => {
    const { terms, complete } = generatePlan([]);
    const placed = allCourses(terms);

    expect(complete).toBe(false);
    expect(placed).toContain("COMP-3415");
    const termOf = (code: string) =>
      terms.find((t) => t.courses.includes(code))!.term;
    expect(termOf("COMP-3415")).toBeGreaterThan(termOf("COMP-2412"));
    expect(termOf("COMP-3415")).toBeGreaterThan(termOf("COMP-2477"));
  });
});
