import { describe, expect, it } from "vitest";
import { isAuthPage, isProtectedPath } from "@/lib/supabase/routes";

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/dashboard/settings"])("protects %s", (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });

  it.each(["/", "/login", "/dashboardx", "/auth/callback"])(
    "does not protect %s",
    (path) => {
      expect(isProtectedPath(path)).toBe(false);
    },
  );
});

describe("isAuthPage", () => {
  it.each(["/login", "/signup"])("matches %s", (path) => {
    expect(isAuthPage(path)).toBe(true);
  });

  it.each(["/", "/dashboard", "/loginx"])("does not match %s", (path) => {
    expect(isAuthPage(path)).toBe(false);
  });
});
