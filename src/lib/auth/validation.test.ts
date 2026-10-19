import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, parseCredentials } from "./validation";

function form(email?: string, password?: string) {
  const fd = new FormData();
  if (email !== undefined) fd.set("email", email);
  if (password !== undefined) fd.set("password", password);
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
