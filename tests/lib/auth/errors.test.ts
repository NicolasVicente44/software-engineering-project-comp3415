import { describe, expect, it } from "vitest";
import { friendlyAuthError, GENERIC_AUTH_ERROR } from "@/lib/auth/errors";

describe("friendlyAuthError", () => {
  it.each([
    ["invalid_credentials", /incorrect email or password/i],
    ["email_not_confirmed", /confirm your email/i],
    ["user_already_exists", /already exists/i],
    ["email_exists", /already exists/i],
    ["weak_password", /too weak/i],
    ["same_password", /different from your old one/i],
    ["over_request_rate_limit", /too many/i],
    ["over_email_send_rate_limit", /too many/i],
    ["otp_expired", /expired/i],
  ])("maps %s", (code, expected) => {
    expect(friendlyAuthError({ code, message: "raw supabase text" })).toMatch(
      expected,
    );
  });

  it("explains network failures", () => {
    expect(
      friendlyAuthError({ name: "AuthRetryableFetchError", message: "fetch" }),
    ).toMatch(/could not reach the server/i);
  });

  it("never leaks raw messages for unknown errors", () => {
    expect(friendlyAuthError({ code: "weird", message: "raw text" })).toBe(
      GENERIC_AUTH_ERROR,
    );
    expect(friendlyAuthError({ message: "raw text" })).toBe(GENERIC_AUTH_ERROR);
  });
});
