import {
  DEFAULT_CREDIT_LIMIT,
  generatePlan,
  type PlanResult,
} from "@/lib/planner/generate-plan";
import { normalizeCourseCode } from "@/lib/prerequisites/check";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type LoadedPlan = {
  plan: PlanResult | null;
  creditLimit: number;
  error: boolean;
};

// builds the student's plan the same way the plan page does (us-10)
export async function loadPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<LoadedPlan> {
  const { data: courses, error: coursesError } = await supabase
    .from("student_courses")
    .select("course_code, credits, status, prerequisites")
    .eq("user_id", userId);

  if (coursesError) {
    console.error("Failed to load courses for plan: ", coursesError);
  }

  const { data: settings, error: settingsError } = await supabase
    .from("student_settings")
    .select("credit_limit")
    .eq("user_id", userId)
    .maybeSingle();

  if (settingsError) {
    console.error("Failed to load credit limit for plan: ", settingsError);
  }

  const creditLimit = Number(settings?.credit_limit ?? DEFAULT_CREDIT_LIMIT);

  if (coursesError || settingsError) {
    return { plan: null, creditLimit, error: true };
  }

  const credits: Record<string, number> = {};
  const prereqMap: Record<string, string[]> = {};
  for (const course of courses ?? []) {
    const code = normalizeCourseCode(course.course_code);
    if (course.credits != null) {
      credits[code] = Number(course.credits);
    }
    prereqMap[code] = (course.prerequisites ?? []).map(normalizeCourseCode);
  }

  const codesWith = (...statuses: string[]) =>
    (courses ?? [])
      .filter((course) => statuses.includes(course.status))
      .map((course) => course.course_code);
  const completed = codesWith("completed");
  const toTake = codesWith("in_progress", "failed");

  const plan = generatePlan(completed, toTake, prereqMap, { creditLimit, credits });

  return { plan, creditLimit, error: false };
}
