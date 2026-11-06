import { normalizeCourseCode } from "@/lib/prerequisites/check";
import { PREREQUISITES } from "@/lib/prerequisites/data";

// credit limit used when a student has not saved one (us-06)
export const DEFAULT_CREDIT_LIMIT = 2.5;

// credits assumed for a course with no known credit value, such as a
// prerequisite the student has not added to their course list (us-06)
export const DEFAULT_COURSE_CREDITS = 0.5;

// one term of the generated plan (us-04)
export type PlanTerm = {
  term: number;
  courses: string[];
};

// result of generating a plan (us-04)
export type PlanResult = {
  terms: PlanTerm[];
  // true when there is nothing left to plan
  complete: boolean;
  // courses that could not be placed (circular prerequisites)
  unschedulable: string[];
  // courses worth more than the credit limit, each placed in a term of
  // its own because they can never fit under it (us-06)
  overLimit: string[];
};

// optional credit limit for the plan (us-06)
export type PlanOptions = {
  // most credits allowed in one term; no limit when left out
  creditLimit?: number;
  // course code -> credits
  credits?: Record<string, number>;
};

// small tolerance so 0.1 + 0.2 style sums still fit exactly at the limit
const EPSILON = 1e-9;

// orders course codes the same way everywhere in the plan
const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// build a term-by-term plan from the courses the student still has to take:
// each appears in exactly one term, after all of its prerequisites (us-04),
// and no term goes over the credit limit (us-06)
export function generatePlan(
  completedCodes: string[],
  required: string[],
  rawPrereqMap: Record<string, string[]> = PREREQUISITES,
  { creditLimit = Infinity, credits: rawCredits = {} }: PlanOptions = {},
): PlanResult {
  // normalise the map keys so lookups match normalised course codes
  const prereqMap: Record<string, string[]> = {};
  for (const [key, prereqs] of Object.entries(rawPrereqMap)) {
    const code = normalizeCourseCode(key);
    prereqMap[code] = [...(prereqMap[code] ?? []), ...prereqs];
  }
  const credits: Record<string, number> = {};
  for (const [key, value] of Object.entries(rawCredits)) {
    credits[normalizeCourseCode(key)] = value;
  }
  const creditsOf = (code: string) => credits[code] ?? DEFAULT_COURSE_CREDITS;

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
    return { terms: [], complete: true, unschedulable: [], overLimit: [] };
  }

  // course -> remaining courses that list it as a prerequisite
  const dependents: Record<string, string[]> = {};
  for (const code of remaining) {
    for (const prereq of prereqMap[code] ?? []) {
      const p = normalizeCourseCode(prereq);
      dependents[p] = [...(dependents[p] ?? []), code];
    }
  }

  // length of the longest chain of courses waiting on this one; when the
  // credit limit leaves no room for every ready course, the longest chains
  // start first so the plan is not stretched out (us-06)
  const chainLengths: Record<string, number> = {};
  const chainLength = (code: string): number => {
    if (code in chainLengths) return chainLengths[code];
    // marks the course while visiting so circular prerequisites stop here.
    // inside a cycle the lengths are only approximate, which is fine since
    // those courses end up unschedulable anyway
    chainLengths[code] = 0;
    const longest = Math.max(0, ...(dependents[code] ?? []).map((d) => chainLength(d) + 1));
    chainLengths[code] = longest;
    return longest;
  };

  const terms: PlanTerm[] = [];
  const overLimit: string[] = [];
  while (remaining.size > 0) {
    // a course is ready when all of its prerequisites are done; longest
    // chain first, then by course code
    const ready = [...remaining]
      .filter((code) => (prereqMap[code] ?? []).every((p) => done.has(normalizeCourseCode(p))))
      .sort((a, b) => chainLength(b) - chainLength(a) || byCode(a, b));

    // nothing is ready but courses remain: circular prerequisites
    if (ready.length === 0) {
      return {
        terms,
        complete: false,
        unschedulable: [...remaining].sort(),
        overLimit,
      };
    }

    // fill the term with ready courses that still fit; the rest wait for
    // the next term that has room (us-06)
    const placed: string[] = [];
    let used = 0;
    for (const code of ready) {
      const courseCredits = creditsOf(code);
      if (used + courseCredits <= creditLimit + EPSILON) {
        placed.push(code);
        used += courseCredits;
      } else if (placed.length === 0) {
        // too big for any term: give it a term of its own so the plan
        // can still finish, and report it. this is the one case where a
        // term goes over the limit, and the plan page warns about it
        placed.push(code);
        overLimit.push(code);
        break;
      }
    }

    terms.push({ term: terms.length + 1, courses: [...placed].sort(byCode) });
    placed.forEach((code) => {
      remaining.delete(code);
      done.add(code);
    });
  }

  return { terms, complete: false, unschedulable: [], overLimit };
}
