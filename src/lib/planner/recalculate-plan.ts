import { normalizeCourseCode } from "@/lib/prerequisites/check";
import { DEFAULT_COURSE_CREDITS, type PlanOptions, type PlanTerm } from "@/lib/planner/generate-plan";

// a course that changed term when the plan was recalculated (us-05)
export type MovedCourse = {
  code: string;
  from: number;
  to: number;
};

// what a status change did to the saved plan (us-05)
export type PlanChange = {
  // the course whose status changed
  course: string;
  status: string;
  // its term before and after; null when it was not in the plan / was removed
  from: number | null;
  to: number | null;
  // other courses that moved later because of it
  moved: MovedCourse[];
};

export type RecalculateResult = {
  terms: PlanTerm[];
  change: PlanChange;
  // courses that could not be placed (circular prerequisites)
  unschedulable: string[];
};

// statuses for courses the student still has to take (us-04, us-05)
export const PLANNED_STATUSES = ["in_progress", "failed", "dropped"];

// small tolerance so 0.1 + 0.2 style sums still fit exactly at the limit
const EPSILON = 1e-9;

const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// update a saved plan after one course's status changes, moving as little as
// possible (us-05):
// - completed: the course is removed from the plan
// - failed or dropped: the course moves to a later term than before, and every
//   course that depends on it (directly or through another course) moves after it
// - in progress: a course not in the plan yet is added after its prerequisites
// no course ever moves earlier, and no term goes over the credit limit
export function recalculatePlan(
  savedTerms: PlanTerm[],
  changedCourse: string,
  status: string,
  rawPrereqMap: Record<string, string[]> = {},
  { creditLimit = Infinity, credits: rawCredits = {} }: PlanOptions = {},
): RecalculateResult {
  const course = normalizeCourseCode(changedCourse);

  // where every course is in the saved plan
  const termOf: Record<string, number> = {};
  for (const term of savedTerms) {
    for (const code of term.courses) {
      termOf[normalizeCourseCode(code)] = term.term;
    }
  }
  const from = termOf[course] ?? null;

  const unchanged = (): RecalculateResult => ({
    terms: savedTerms,
    change: { course, status, from, to: from, moved: [] },
    unschedulable: [],
  });

  if (status === "completed") {
    if (from === null) return unchanged();
    const terms = trimTrailingEmptyTerms(
      savedTerms.map((term) => ({
        term: term.term,
        courses: term.courses.filter((code) => normalizeCourseCode(code) !== course),
      })),
    );
    return { terms, change: { course, status, from, to: null, moved: [] }, unschedulable: [] };
  }

  if (!PLANNED_STATUSES.includes(status)) return unchanged();

  // an in-progress course already in the plan stays where it is
  if (status === "in_progress" && from !== null) return unchanged();

  const prereqMap: Record<string, string[]> = {};
  for (const [key, prereqs] of Object.entries(rawPrereqMap)) {
    prereqMap[normalizeCourseCode(key)] = prereqs.map(normalizeCourseCode);
  }
  const credits: Record<string, number> = {};
  for (const [key, value] of Object.entries(rawCredits)) {
    credits[normalizeCourseCode(key)] = value;
  }
  const creditsOf = (code: string) => credits[code] ?? DEFAULT_COURSE_CREDITS;

  // earliest term each course may go in: its saved term, or for the changed
  // course the term after its old one (or term 1 if it was not planned)
  const earliest: Record<string, number> = { ...termOf };
  earliest[course] = from === null ? 1 : from + 1;

  const remaining = new Set(Object.keys(earliest));
  // only prerequisites that are also in the plan have to come first
  const plannedPrereqs = (code: string) =>
    (prereqMap[code] ?? []).filter((p) => p !== code && earliest[p] !== undefined);

  const placedIn: Record<string, number> = {};
  const terms: PlanTerm[] = [];
  const lastSavedTerm = Math.max(0, ...savedTerms.map((t) => t.term));
  // a plan can never need more terms than this, so going past it means the
  // remaining courses wait on each other (circular prerequisites)
  const maxTerm = Math.max(lastSavedTerm, earliest[course]) + remaining.size;

  for (let term = 1; remaining.size > 0 && term <= maxTerm; term++) {
    const ready = [...remaining]
      .filter(
        (code) =>
          earliest[code] <= term &&
          plannedPrereqs(code).every((p) => placedIn[p] !== undefined && placedIn[p] < term),
      )
      // courses already planned for this term keep their place first, then
      // the ones that have waited longest
      .sort(
        (a, b) =>
          Number(earliest[b] === term && b !== course) - Number(earliest[a] === term && a !== course) ||
          earliest[a] - earliest[b] ||
          byCode(a, b),
      );

    const placed: string[] = [];
    let used = 0;
    for (const code of ready) {
      const courseCredits = creditsOf(code);
      if (used + courseCredits <= creditLimit + EPSILON) {
        placed.push(code);
        used += courseCredits;
      } else if (placed.length === 0) {
        // too big for any term: it gets a term of its own, as in generatePlan
        placed.push(code);
        break;
      }
    }

    placed.forEach((code) => {
      placedIn[code] = term;
      remaining.delete(code);
    });
    terms.push({ term, courses: placed.sort(byCode) });
  }

  const moved = Object.keys(termOf)
    .filter((code) => code !== course && placedIn[code] !== undefined && placedIn[code] !== termOf[code])
    .map((code) => ({ code, from: termOf[code], to: placedIn[code] }))
    .sort((a, b) => a.to - b.to || byCode(a.code, b.code));

  return {
    terms: trimTrailingEmptyTerms(terms),
    change: { course, status, from, to: placedIn[course] ?? null, moved },
    unschedulable: [...remaining].sort(byCode),
  };
}

// empty terms in the middle stay (a gap left by a moved course), but empty
// terms at the end of the plan are dropped
function trimTrailingEmptyTerms(terms: PlanTerm[]): PlanTerm[] {
  const result = [...terms];
  while (result.length > 0 && result[result.length - 1].courses.length === 0) {
    result.pop();
  }
  return result;
}
