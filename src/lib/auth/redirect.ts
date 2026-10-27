const DEFAULT_PATH = "/dashboard";

/** Only allow same-site relative paths, so `?next=` can't cause an open redirect. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return DEFAULT_PATH;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_PATH;
  return next;
}
