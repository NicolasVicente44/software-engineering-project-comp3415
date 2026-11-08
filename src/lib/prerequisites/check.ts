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

// uses DFS to traverse the "graph" and find if a cycle would be created
export function looksForCircularPrerequisite(
  targetCode: string,
  prerequisites: string[],
  studentCourses: {course_code: string; prerequisites: string[];}[]
): boolean {
  
  const normalizedTarget = normalizeCourseCode(targetCode);
  const prereqMap: Record<string, string[]> = {};

  for (const course of studentCourses) {  // maps each course to the prereqMap
    prereqMap[normalizeCourseCode(course.course_code)] = (course.prerequisites ?? []).map(normalizeCourseCode);
  }

  // empty set to store values already checked
  const visited = new Set<string>();

  const visit = (code: string): boolean => {
    const normalizedCode = normalizeCourseCode(code); 
    if (normalizedCode === normalizedTarget) return true; // if the target is found then the cycle is found
    if(visited.has(normalizedCode)) return false; // doesn't continue to search something it has already visited
    visited.add(normalizedCode); // adds the course to the visited set before exploring prereqs
    return (prereqMap[normalizedCode] ?? []).some(visit); // uses recursion to check the current courses prereqs to check if lead back to target
  };

  return prerequisites.some(visit); // starts DFS on the proposed prereqs the user entered
}
