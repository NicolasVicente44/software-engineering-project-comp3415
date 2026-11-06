import { PREREQUISITES } from "./data";

// normalize course code to DEPT-NUMBER (us-03)
export function normalizeCourseCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[\s_-]/g, "");
  const match = cleaned.match(/^([A-Z]+)(\d+)$/);
  return match ? `${match[1]}-${match[2]}` : cleaned;
}

// result of a prerequisite check (us-03)
export type PrereqResult = {
  eligible: boolean;
  required: string[];
  missing: string[];
};

// check completed courses against a course's prerequisites (us-03)
export function checkPrerequisites(
  targetCode: string,
  studentCourses: { course_code: string; status: string }[],
  prereqMap: Record<string, string[]> = PREREQUISITES,
): PrereqResult {
  const required = prereqMap[normalizeCourseCode(targetCode)] ?? [];
  const completed = new Set(
    studentCourses
      .filter((course) => course.status === "completed")
      .map((course) => normalizeCourseCode(course.course_code)),
  );
  const missing = required.filter((code) => !completed.has(code));
  return { eligible: missing.length === 0, required, missing };
}

// used when deleting courses, will show the user what courses the attempted deletec course will depend on
// only shows direct prereqs
export function findDependentCourses(
  targetCode: string,
  studentCourses: {course_code: string; prerequisites: string[];}[]
): string[] {
  const normalizedCode = normalizeCourseCode(targetCode);

  return studentCourses
    .filter(course => 
      course.prerequisites.some(
        prereq => normalizeCourseCode(prereq) === normalizedCode
      )
    )
    .map(course => course.course_code);
}

// receives student courses and prerequisites and finds what prereqs havent actually been added to their course list yet
export function findMissingPrerequisitesInCourseList(
  prerequisites: string[],
  studentCourses: {course_code: string;}[]
): string[] {

    const existingCourseCodes = new Set(
        studentCourses.map(course => normalizeCourseCode(course.course_code))
    );

    return prerequisites.filter(code => !existingCourseCodes.has(normalizeCourseCode(code)));
  }

