import { describe, expect, it } from "vitest";
import {
  getPasswordStrength,
  MIN_PASSWORD_LENGTH,
  parseCredentials,
  parseEmail,
  parseNewPassword,
  parseSignUp,
} from "@/lib/auth/validation";

function form(email?: string, password?: string) {
  const fd = new FormData();
  if (email !== undefined) fd.set("email", email);
  if (password !== undefined) fd.set("password", password);
  return fd;
}

function fields(values: Record<string, string>) {
  const fd = new FormData();
  Object.entries(values).forEach(([key, value]) => fd.set(key, value));
  return fd;
}

describe("parseCredentials", () => {
  it("accepts a valid email and password", () => {
    const result = parseCredentials(form("user@example.com", "password123"));
    expect(result).toEqual({
      ok: true,
      value: { email: "user@example.com", password: "password123" },
    });
  });

  it("trims whitespace around the email", () => {
    const result = parseCredentials(
      form("  user@example.com  ", "password123"),
    );
    expect(result.ok && result.value.email).toBe("user@example.com");
  });

  it.each(["", "not-an-email", "a@b", "a b@c.com"])(
    "rejects invalid email %j",
    (email) => {
      const result = parseCredentials(form(email, "password123"));
      expect(result).toEqual({
        ok: false,
        error: "Enter a valid email address.",
      });
    },
  );

  it("rejects a password shorter than the minimum", () => {
    const result = parseCredentials(
      form("user@example.com", "x".repeat(MIN_PASSWORD_LENGTH - 1)),
    );
    expect(result.ok).toBe(false);
  });

  it("accepts a password exactly at the minimum", () => {
    const result = parseCredentials(
      form("user@example.com", "x".repeat(MIN_PASSWORD_LENGTH)),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(parseCredentials(form()).ok).toBe(false);
  });
});

describe("parseEmail", () => {
  it("accepts and trims a valid email", () => {
    expect(parseEmail(fields({ email: " a@b.co " }))).toEqual({
      ok: true,
      value: { email: "a@b.co" },
    });
  });

  it("rejects an invalid email", () => {
    expect(parseEmail(fields({ email: "nope" })).ok).toBe(false);
  });
});

describe("parseNewPassword", () => {
  it("accepts matching passwords", () => {
    const result = parseNewPassword(
      fields({ password: "password123", confirmPassword: "password123" }),
    );
    expect(result).toEqual({ ok: true, value: { password: "password123" } });
  });

  it("rejects mismatched passwords", () => {
    const result = parseNewPassword(
      fields({ password: "password123", confirmPassword: "password124" }),
    );
    expect(result).toEqual({ ok: false, error: "Passwords do not match." });
  });

  it("rejects a short password before checking the match", () => {
    const result = parseNewPassword(
      fields({ password: "short", confirmPassword: "other" }),
    );
    expect(result.ok === false && result.error).toMatch(/at least 8/);
  });

  it("rejects a missing confirmation", () => {
    expect(parseNewPassword(fields({ password: "password123" })).ok).toBe(
      false,
    );
  });
});

describe("parseSignUp", () => {
  it("accepts a valid sign-up", () => {
    const result = parseSignUp(
      fields({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
      }),
    );
    expect(result).toEqual({
      ok: true,
      value: { email: "user@example.com", password: "password123" },
    });
  });

  it("reports an invalid email first", () => {
    const result = parseSignUp(
      fields({ email: "x", password: "a", confirmPassword: "b" }),
    );
    expect(result.ok === false && result.error).toBe(
      "Enter a valid email address.",
    );
  });

  it("rejects mismatched passwords", () => {
    const result = parseSignUp(
      fields({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "nope",
      }),
    );
    expect(result.ok === false && result.error).toBe("Passwords do not match.");
  });
});

describe("getPasswordStrength", () => {
  it.each([
    ["", 0, ""],
    ["abc", 0, "Too short"],
    ["abcdefgh", 1, "Weak"],
    ["abcdefg1", 1, "Weak"],
    ["Abcdefg1", 2, "Fair"],
    ["Abcdefg1!", 3, "Good"],
    ["Abcdefghijk1!", 4, "Strong"],
  ])("rates %j", (password, score, label) => {
    expect(getPasswordStrength(password)).toEqual({ score, label });
  });
});
