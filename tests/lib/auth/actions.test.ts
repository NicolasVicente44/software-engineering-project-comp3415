import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  signInWithPassword,
  signUpMock,
  signOutMock,
  resetPasswordForEmail,
  updateUser,
  getUser,
  redirect,
} = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUpMock: vi.fn(),
  signOutMock: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
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
      getUser,
    },
  }),
}));

import {
  changeEmail,
  changePassword,
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

function changePasswordForm(
  currentPassword: string,
  password: string,
  confirmPassword = password,
) {
  const fd = new FormData();
  fd.set("currentPassword", currentPassword);
  fd.set("password", password);
  fd.set("confirmPassword", confirmPassword);
  return fd;
}

const signedIn = () =>
  getUser.mockResolvedValue({
    data: { user: { id: "user-1234", email: "student@example.com" } },
  });

describe("changePassword (us-11)", () => {
  it("requires the current password", async () => {
    const state = await changePassword({}, changePasswordForm("", "newpassword1"));
    expect(state.error).toBe("Enter your current password.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched new passwords without changing anything", async () => {
    const state = await changePassword(
      {},
      changePasswordForm("oldpassword", "newpassword1", "newpassword2"),
    );
    expect(state.error).toBe("Passwords do not match.");
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects a new password that is too short", async () => {
    const state = await changePassword({}, changePasswordForm("oldpassword", "short"));
    expect(state.error).toMatch(/at least 8/);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("returns an error when the user is not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const state = await changePassword({}, changePasswordForm("oldpassword", "newpassword1"));
    expect(state.error).toBe("You must be signed in to change your password.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("does not change the password when the current one is wrong", async () => {
    signedIn();
    signInWithPassword.mockResolvedValue({
      error: { code: "invalid_credentials", message: "bad" },
    });
    const state = await changePassword({}, changePasswordForm("wrongpass", "newpassword1"));
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "wrongpass",
    });
    expect(state.error).toBe("Your current password is incorrect.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("shows a friendly message when the new password matches the old one", async () => {
    signedIn();
    signInWithPassword.mockResolvedValue({ error: null });
    updateUser.mockResolvedValue({ error: { code: "same_password", message: "same" } });
    const state = await changePassword({}, changePasswordForm("oldpassword", "oldpassword"));
    expect(state.error).toMatch(/different from your old one/i);
  });

  it("changes the password and confirms it without redirecting", async () => {
    signedIn();
    signInWithPassword.mockResolvedValue({ error: null });
    updateUser.mockResolvedValue({ error: null });
    const state = await changePassword({}, changePasswordForm("oldpassword", "newpassword1"));
    expect(updateUser).toHaveBeenCalledWith({ password: "newpassword1" });
    expect(state).toEqual({ message: "Your password was changed." });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("changeEmail (us-11)", () => {
  it("returns a validation error for a bad email", async () => {
    const state = await changeEmail({}, emailForm("not-an-email"));
    expect(state.error).toBe("Enter a valid email address.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("returns an error when the user is not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const state = await changeEmail({}, emailForm("new@example.com"));
    expect(state.error).toBe("You must be signed in to change your email.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects the email the student already has", async () => {
    signedIn();
    const state = await changeEmail({}, emailForm("Student@Example.com"));
    expect(state.error).toBe("That is already your email address.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("sends a confirmation link that returns to the profile", async () => {
    signedIn();
    updateUser.mockResolvedValue({ error: null });
    const state = await changeEmail({}, emailForm("new@example.com"));
    expect(updateUser).toHaveBeenCalledWith(
      { email: "new@example.com" },
      { emailRedirectTo: "http://localhost:3000/auth/callback?next=/profile" },
    );
    expect(state.message).toMatch(/confirmation link to new@example.com/);
  });

  it("shows a friendly message when the email is taken", async () => {
    signedIn();
    updateUser.mockResolvedValue({ error: { code: "email_exists", message: "taken" } });
    const state = await changeEmail({}, emailForm("taken@example.com"));
    expect(state.error).toMatch(/already exists/);
  });
});
