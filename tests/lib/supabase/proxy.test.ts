import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

import { updateSession } from "@/lib/supabase/proxy";

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe("updateSession", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("redirects anonymous users from protected routes to /login", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(request("/dashboard"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("lets anonymous users view public routes", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    for (const path of ["/", "/login"]) {
      const response = await updateSession(request(path));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("lets authenticated users reach protected routes", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "1" } } });
    const response = await updateSession(request("/dashboard"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from /login", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "1" } } });
    const response = await updateSession(request("/login"));
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });
});
