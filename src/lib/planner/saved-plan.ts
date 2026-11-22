import type { createClient } from "@/lib/supabase/server";
import { normalizeCourseCode } from "@/lib/prerequisites/check";
import {
  DEFAULT_CREDIT_LIMIT,
  generatePlan,
  type PlanTerm,
} from "@/lib/planner/generate-plan";
import {
  PLANNED_STATUSES,
  recalculatePlan,
  type PlanChange,
} from "@/lib/planner/recalculate-plan";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// the plan saved in student_settings.saved_plan (us-05)
export type SavedPlan = {
  terms: PlanTerm[];
  // credit limit the plan was built with, to notice when it changes
  creditLimit: number;
  generatedAt: string;
  // courses that could not be placed (circular prerequisites)
  unschedulable: string[];
  // what the last status change did, shown on the plan page
  lastChange?: PlanChange;
};

export type StudentCourse = {
  course_name: string | null;
  course_code: string;
  credits: number | string | null;
  status: string;
  prerequisites: string[] | null;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

// read a saved plan from the database, ignoring anything malformed
export function parseSavedPlan(value: unknown): SavedPlan | null {
  if (!value || typeof value !== "object") return null;
  const plan = value as Record<string, unknown>;

  if (!Array.isArray(plan.terms)) return null;
  const terms: PlanTerm[] = [];
  for (const term of plan.terms) {
    if (!term || typeof term !== "object") return null;
    const { term: number, courses } = term as Record<string, unknown>;
    if (typeof number !== "number" || !isStringArray(courses)) return null;
    terms.push({ term: number, courses });
  }

  return {
    terms,
    creditLimit: typeof plan.creditLimit === "number" ? plan.creditLimit : DEFAULT_CREDIT_LIMIT,
    generatedAt: typeof plan.generatedAt === "string" ? plan.generatedAt : "",
    unschedulable: isStringArray(plan.unschedulable) ? plan.unschedulable : [],
    lastChange:
      plan.lastChange && typeof plan.lastChange === "object"
        ? (plan.lastChange as PlanChange)
        : undefined,
  };
}

// everything the planner needs, built from the student's own courses (us-04, us-06)
export function planInputs(courses: StudentCourse[]) {
  const credits: Record<string, number> = {};
  const prereqMap: Record<string, string[]> = {};

  for (const course of courses) {
    const code = normalizeCourseCode(course.course_code);
    // a course without a credit value falls back to the planner's default
    if (course.credits != null) {
      credits[code] = Number(course.credits);
    }
    prereqMap[code] = (course.prerequisites ?? []).map(normalizeCourseCode);
  }

  const codesWith = (statuses: string[]) =>
    courses
      .filter((course) => statuses.includes(course.status))
      .map((course) => normalizeCourseCode(course.course_code));

  return {
    credits,
    prereqMap,
    completed: codesWith(["completed"]),
    // in-progress, failed and dropped courses still have to be taken (us-05)
    toTake: codesWith(PLANNED_STATUSES),
  };
}

// load the student's courses, credit limit and saved plan
export async function loadPlanData(supabase: SupabaseClient, userId: string) {
  const { data: courses, error: coursesError } = await supabase
    .from("student_courses")
    .select("course_name, course_code, credits, status, prerequisites")
    .eq("user_id", userId);

  const { data: settings, error: settingsError } = await supabase
    .from("student_settings")
    .select("credit_limit, saved_plan")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    courses: (courses ?? []) as StudentCourse[],
    coursesError,
    settingsError,
    creditLimit: Number(settings?.credit_limit ?? DEFAULT_CREDIT_LIMIT),
    savedPlan: parseSavedPlan(settings?.saved_plan),
  };
}

async function savePlan(supabase: SupabaseClient, userId: string, plan: SavedPlan) {
  return supabase
    .from("student_settings")
    .upsert({ user_id: userId, saved_plan: plan, updated_at: new Date().toISOString() });
}

// build a new plan from scratch and save it (us-04, us-05)
export async function generateAndSavePlan(supabase: SupabaseClient, userId: string) {
  const data = await loadPlanData(supabase, userId);
  if (data.coursesError || data.settingsError) {
    return { error: data.coursesError ?? data.settingsError };
  }

  const { credits, prereqMap, completed, toTake } = planInputs(data.courses);
  const result = generatePlan(completed, toTake, prereqMap, {
    creditLimit: data.creditLimit,
    credits,
  });

  const { error } = await savePlan(supabase, userId, {
    terms: result.terms,
    creditLimit: data.creditLimit,
    generatedAt: new Date().toISOString(),
    unschedulable: result.unschedulable,
  });
  return { error };
}

// update the saved plan after a course's status changes (us-05); returns the
// change, or null when the student has no saved plan to update
export async function recalculateSavedPlan(
  supabase: SupabaseClient,
  userId: string,
  courseCode: string,
  status: string,
): Promise<PlanChange | null> {
  const data = await loadPlanData(supabase, userId);
  if (data.coursesError || data.settingsError || !data.savedPlan) return null;

  const { credits, prereqMap } = planInputs(data.courses);
  const result = recalculatePlan(data.savedPlan.terms, courseCode, status, prereqMap, {
    creditLimit: data.creditLimit,
    credits,
  });

  const { error } = await savePlan(supabase, userId, {
    ...data.savedPlan,
    terms: result.terms,
    unschedulable: [
      ...new Set([
        ...data.savedPlan.unschedulable.filter((code) => code !== result.change.course),
        ...result.unschedulable,
      ]),
    ],
    lastChange: result.change,
  });

  if (error) {
    console.error("Failed to save recalculated plan:", error);
    return null;
  }
  return result.change;
}
