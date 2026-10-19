const PROTECTED_PREFIXES = ["/dashboard", "/reset-password"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => matches(pathname, p));
}

export function isAuthPage(pathname: string) {
  return AUTH_PAGES.some((p) => matches(pathname, p));
}
