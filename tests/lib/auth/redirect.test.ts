import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it.each(["/reset-password", "/dashboard/settings"])("allows %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    null,
    undefined,
    "",
    "dashboard",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
  ])("falls back to /dashboard for %j", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });
});
