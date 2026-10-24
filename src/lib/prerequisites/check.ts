// normalize course code to DEPT-NUMBER (us-03)
export function normalizeCourseCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[\s_-]/g, "");
  const match = cleaned.match(/^([A-Z]+)(\d+)$/);
  return match ? `${match[1]}-${match[2]}` : cleaned;
}
