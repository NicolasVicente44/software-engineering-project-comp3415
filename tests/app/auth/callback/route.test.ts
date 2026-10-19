import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

import { GET } from "@/app/auth/callback/route";

function call(query: string) {
  return GET(new NextRequest(`http://localhost:3000/auth/callback${query}`));
}

beforeEach(() => {
  exchangeCodeForSession.mockReset();
});

describe("GET /auth/callback", () => {
  it("redirects to /dashboard after a successful exchange", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await call("?code=abc");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });

  it("redirects to /login with an error when the exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "bad" } });
    const response = await call("?code=abc");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=auth_callback_failed",
    );
  });

  it("redirects to /login with an error when no code is present", async () => {
    const response = await call("");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=auth_callback_failed",
    );
  });
});
