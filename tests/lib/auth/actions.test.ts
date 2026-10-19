import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  signInWithPassword,
  signUpMock,
  signOutMock,
  resetPasswordForEmail,
  updateUser,
  redirect,
} = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUpMock: vi.fn(),
  signOutMock: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3000" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword,
      signUp: signUpMock,
      signOut: signOutMock,
      resetPasswordForEmail,
      updateUser,
    },
  }),
}));

import {
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from "@/lib/auth/actions";

function form(email: string, password: string, confirmPassword = password) {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  fd.set("confirmPassword", confirmPassword);
  return fd;
}

function emailForm(email: string) {
  const fd = new FormData();
  fd.set("email", email);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signIn", () => {
  it("returns a validation error without calling Supabase", async () => {
    const state = await signIn({}, form("bad", "password123"));
    expect(state.error).toBe("Enter a valid email address.");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("shows a friendly message for wrong credentials", async () => {
    signInWithPassword.mockResolvedValue({
      error: {
        code: "invalid_credentials",
        message: "Invalid login credentials",
      },
    });
    const state = await signIn({}, form("user@example.com", "password123"));
    expect(state.error).toBe("Incorrect email or password.");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("tells the user when their email is not confirmed", async () => {
    signInWithPassword.mockResolvedValue({
      error: { code: "email_not_confirmed", message: "Email not confirmed" },
    });
    const state = await signIn({}, form("user@example.com", "password123"));
    expect(state.error).toMatch(/confirm your email/i);
  });

  it("redirects to /dashboard on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      signIn({}, form("user@example.com", "password123")),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
  });
});

describe("signUp", () => {
  it("returns a validation error for a short password", async () => {
    const state = await signUp({}, form("user@example.com", "short"));
    expect(state.error).toMatch(/at least 8/);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords without calling Supabase", async () => {
    const state = await signUp(
      {},
      form("user@example.com", "password123", "different123"),
    );
    expect(state.error).toBe("Passwords do not match.");
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("shows a friendly message when Supabase reports an existing user", async () => {
    signUpMock.mockResolvedValue({
      data: {},
      error: {
        code: "user_already_exists",
        message: "User already registered",
      },
    });
    const state = await signUp({}, form("user@example.com", "password123"));
    expect(state.error).toMatch(/already exists/i);
  });

  it("detects an already-registered email hidden behind empty identities", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    const state = await signUp({}, form("user@example.com", "password123"));
    expect(state.error).toMatch(/already exists/i);
    expect(state.message).toBeUndefined();
  });

  it("asks the user to confirm their email when no session is returned", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { identities: [{ id: "1" }] }, session: null },
      error: null,
    });
    const state = await signUp({}, form("user@example.com", "password123"));
    expect(state.message).toBe("Check your email to confirm your account.");
    expect(signUpMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
      options: { emailRedirectTo: "http://localhost:3000/auth/callback" },
    });
  });

  it("redirects to /dashboard when a session is returned", async () => {
    signUpMock.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });
    await expect(
      signUp({}, form("user@example.com", "password123")),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });
});

describe("requestPasswordReset", () => {
  it("returns a validation error for a bad email", async () => {
    const state = await requestPasswordReset({}, emailForm("nope"));
    expect(state.error).toBe("Enter a valid email address.");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("sends the reset email with a redirect through the callback", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    const state = await requestPasswordReset(
      {},
      emailForm("user@example.com"),
    );
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
    });
    expect(state.message).toMatch(/if an account exists/i);
  });

  it("gives the same response when the account does not exist", async () => {
    resetPasswordForEmail.mockResolvedValue({
      error: { code: "user_not_found", message: "User not found" },
    });
    const state = await requestPasswordReset(
      {},
      emailForm("ghost@example.com"),
    );
    expect(state.error).toBeUndefined();
    expect(state.message).toMatch(/if an account exists/i);
  });

  it("surfaces rate limit errors", async () => {
    resetPasswordForEmail.mockResolvedValue({
      error: { code: "over_email_send_rate_limit", message: "rate limit" },
    });
    const state = await requestPasswordReset(
      {},
      emailForm("user@example.com"),
    );
    expect(state.error).toMatch(/too many/i);
  });
});

describe("updatePassword", () => {
  it("rejects mismatched passwords", async () => {
    const state = await updatePassword(
      {},
      form("", "password123", "different123"),
    );
    expect(state.error).toBe("Passwords do not match.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects short passwords", async () => {
    const state = await updatePassword({}, form("", "short"));
    expect(state.error).toMatch(/at least 8/);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("shows a friendly message when the new password matches the old one", async () => {
    updateUser.mockResolvedValue({
      error: { code: "same_password", message: "same" },
    });
    const state = await updatePassword({}, form("", "password123"));
    expect(state.error).toMatch(/different from your old one/i);
  });

  it("updates the password and redirects to /dashboard", async () => {
    updateUser.mockResolvedValue({ error: null });
    await expect(updatePassword({}, form("", "password123"))).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );
    expect(updateUser).toHaveBeenCalledWith({ password: "password123" });
  });
});

describe("signOut", () => {
  it("signs out and redirects to /login", async () => {
    signOutMock.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(signOutMock).toHaveBeenCalled();
  });
});
