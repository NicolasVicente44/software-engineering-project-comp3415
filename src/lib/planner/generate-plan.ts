import { normalizeCourseCode } from "@/lib/prerequisites/check";
import { PREREQUISITES } from "@/lib/prerequisites/data";
import { REQUIRED_COURSES } from "./program";

// one term of the generated plan (us-04)
export type PlanTerm = {
  term: number;
  courses: string[];
};

// result of generating a plan (us-04)
export type PlanResult = {
  terms: PlanTerm[];
  // true when the student has nothing left to take
  complete: boolean;
  // courses that could not be placed (circular prerequisites)
  unschedulable: string[];
};

// build a term-by-term plan: every remaining required course appears in
// exactly one term, after all of its prerequisites (us-04)
export function generatePlan(
  completedCodes: string[],
  required: string[] = REQUIRED_COURSES,
  prereqMap: Record<string, string[]> = PREREQUISITES,
): PlanResult {
  const done = new Set(completedCodes.map(normalizeCourseCode));

  // remaining = required courses not completed, plus any prerequisites
  // they depend on (so the plan is always valid)
  const remaining = new Set<string>();
  const visit = (raw: string) => {
    const code = normalizeCourseCode(raw);
    if (done.has(code) || remaining.has(code)) return;
    remaining.add(code);
    (prereqMap[code] ?? []).forEach(visit);
  };
  required.forEach(visit);

  if (remaining.size === 0) {
    return { terms: [], complete: true, unschedulable: [] };
  }

  const terms: PlanTerm[] = [];
  while (remaining.size > 0) {
    // a course is ready when all of its prerequisites are done
    const ready = [...remaining]
      .filter((code) => (prereqMap[code] ?? []).every((p) => done.has(normalizeCourseCode(p))))
      .sort();

    // nothing is ready but courses remain: circular prerequisites
    if (ready.length === 0) {
      return { terms, complete: false, unschedulable: [...remaining].sort() };
    }

    terms.push({ term: terms.length + 1, courses: ready });
    ready.forEach((code) => {
      remaining.delete(code);
      done.add(code);
    });
  }

  return { terms, complete: false, unschedulable: [] };
}
