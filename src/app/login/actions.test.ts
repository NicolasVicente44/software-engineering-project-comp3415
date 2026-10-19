import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPassword, signUpMock, signOutMock, redirect } = vi.hoisted(
  () => ({
    signInWithPassword: vi.fn(),
    signUpMock: vi.fn(),
    signOutMock: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
  }),
);

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
    },
  }),
}));

import { signIn, signOut, signUp } from "./actions";

function form(email: string, password: string) {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
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

  it("returns the Supabase error on failure", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const state = await signIn({}, form("user@example.com", "password123"));
    expect(state.error).toBe("Invalid login credentials");
    expect(redirect).not.toHaveBeenCalled();
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

  it("returns the Supabase error on failure", async () => {
    signUpMock.mockResolvedValue({
      data: {},
      error: { message: "User already registered" },
    });
    const state = await signUp({}, form("user@example.com", "password123"));
    expect(state.error).toBe("User already registered");
  });

  it("asks the user to confirm their email when no session is returned", async () => {
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });
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

describe("signOut", () => {
  it("signs out and redirects to /login", async () => {
    signOutMock.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(signOutMock).toHaveBeenCalled();
  });
});
