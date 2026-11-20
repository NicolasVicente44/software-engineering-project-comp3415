import { describe, expect, it } from "vitest";
import { recalculatePlan } from "@/lib/planner/recalculate-plan";

// COMP-1000 -> COMP-2000 -> COMP-3000, and COMP-1500 on its own
const prereqs = {
  "COMP-2000": ["COMP-1000"],
  "COMP-3000": ["COMP-2000"],
};

const plan = [
  { term: 1, courses: ["COMP-1000", "COMP-1500"] },
  { term: 2, courses: ["COMP-2000"] },
  { term: 3, courses: ["COMP-3000"] },
];

describe("recalculatePlan (us-05)", () => {
  it("moves a failed course to a later term and its dependents after it", () => {
    const result = recalculatePlan(plan, "COMP-1000", "failed", prereqs);

    expect(result.terms).toEqual([
      { term: 1, courses: ["COMP-1500"] },
      { term: 2, courses: ["COMP-1000"] },
      { term: 3, courses: ["COMP-2000"] },
      { term: 4, courses: ["COMP-3000"] },
    ]);
    expect(result.change).toEqual({
      course: "COMP-1000",
      status: "failed",
      from: 1,
      to: 2,
      moved: [
        { code: "COMP-2000", from: 2, to: 3 },
        { code: "COMP-3000", from: 3, to: 4 },
      ],
    });
  });

  it("treats a dropped course the same as a failed one", () => {
    const result = recalculatePlan(plan, "COMP-2000", "dropped", prereqs);

    expect(result.change.from).toBe(2);
    expect(result.change.to).toBe(3);
    expect(result.change.moved).toEqual([{ code: "COMP-3000", from: 3, to: 4 }]);
    // courses that do not depend on it keep their term
    expect(result.terms[0]).toEqual({ term: 1, courses: ["COMP-1000", "COMP-1500"] });
  });

  it("moves dependents through a chain, not only direct dependents", () => {
    const result = recalculatePlan(plan, "COMP-1000", "failed", prereqs);

    const termOf = (code: string) => result.terms.find((t) => t.courses.includes(code))?.term;
    expect(termOf("COMP-1000")).toBeLessThan(termOf("COMP-2000")!);
    expect(termOf("COMP-2000")).toBeLessThan(termOf("COMP-3000")!);
  });

  it("removes a completed course from the plan", () => {
    const result = recalculatePlan(plan, "COMP-1500", "completed", prereqs);

    expect(result.terms).toEqual([
      { term: 1, courses: ["COMP-1000"] },
      { term: 2, courses: ["COMP-2000"] },
      { term: 3, courses: ["COMP-3000"] },
    ]);
    expect(result.change).toEqual({
      course: "COMP-1500",
      status: "completed",
      from: 1,
      to: null,
      moved: [],
    });
  });

  it("drops empty terms at the end after a course is removed", () => {
    const result = recalculatePlan(plan, "COMP-3000", "completed", prereqs);

    expect(result.terms).toHaveLength(2);
  });

  it("keeps an empty term in the middle of the plan", () => {
    const result = recalculatePlan(
      [{ term: 1, courses: ["COMP-1000"] }, { term: 2, courses: ["COMP-2000"] }],
      "COMP-1000",
      "failed",
      prereqs,
    );

    expect(result.terms).toEqual([
      { term: 1, courses: [] },
      { term: 2, courses: ["COMP-1000"] },
      { term: 3, courses: ["COMP-2000"] },
    ]);
  });

  it("keeps every term within the credit limit", () => {
    const result = recalculatePlan(
      [
        { term: 1, courses: ["COMP-1000"] },
        { term: 2, courses: ["COMP-1500", "COMP-1600"] },
      ],
      "COMP-1000",
      "failed",
      {},
      { creditLimit: 1, credits: { "COMP-1000": 0.5, "COMP-1500": 0.5, "COMP-1600": 0.5 } },
    );

    // term 2 is already full, so the failed course waits until term 3
    expect(result.terms).toEqual([
      { term: 1, courses: [] },
      { term: 2, courses: ["COMP-1500", "COMP-1600"] },
      { term: 3, courses: ["COMP-1000"] },
    ]);
    expect(result.change.moved).toEqual([]);
  });

  it("never moves a course earlier than its saved term", () => {
    const result = recalculatePlan(plan, "COMP-1500", "failed", prereqs);

    expect(result.terms.find((t) => t.courses.includes("COMP-3000"))?.term).toBe(3);
    expect(result.change.moved).toEqual([]);
  });

  it("adds a course that was not in the plan, before the courses that need it", () => {
    // COMP-1000 was completed, so it is not planned; now it is failed
    const result = recalculatePlan(
      [{ term: 1, courses: ["COMP-2000"] }, { term: 2, courses: ["COMP-3000"] }],
      "COMP-1000",
      "failed",
      prereqs,
    );

    expect(result.terms).toEqual([
      { term: 1, courses: ["COMP-1000"] },
      { term: 2, courses: ["COMP-2000"] },
      { term: 3, courses: ["COMP-3000"] },
    ]);
    expect(result.change.from).toBeNull();
    expect(result.change.to).toBe(1);
  });

  it("leaves the plan alone when an in-progress course is already planned", () => {
    const result = recalculatePlan(plan, "COMP-2000", "in_progress", prereqs);

    expect(result.terms).toBe(plan);
    expect(result.change).toEqual({
      course: "COMP-2000",
      status: "in_progress",
      from: 2,
      to: 2,
      moved: [],
    });
  });

  it("matches course codes regardless of case and spacing", () => {
    const result = recalculatePlan(plan, " comp-1000 ", "failed", prereqs);

    expect(result.change.course).toBe("COMP-1000");
    expect(result.change.to).toBe(2);
  });

  it("does nothing when a completed course was not in the plan", () => {
    const result = recalculatePlan(plan, "COMP-9999", "completed", prereqs);

    expect(result.terms).toBe(plan);
    expect(result.change.to).toBeNull();
  });
});
