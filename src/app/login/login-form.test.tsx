import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { signIn, signUp } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("./actions", () => ({ signIn, signUp }));

import { LoginForm } from "./login-form";

async function fillAndSubmit(buttonName: string) {
  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: buttonName }));
}

describe("LoginForm", () => {
  it("renders sign-in fields and button", () => {
    render(<LoginForm mode="signin" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders the create account button in signup mode", () => {
    render(<LoginForm mode="signup" />);
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("shows the error returned by the action", async () => {
    signIn.mockResolvedValue({ error: "Invalid login credentials" });
    render(<LoginForm mode="signin" />);
    await fillAndSubmit("Sign in");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid login credentials",
    );
  });

  it("shows the confirmation message after signing up", async () => {
    signUp.mockResolvedValue({
      message: "Check your email to confirm your account.",
    });
    render(<LoginForm mode="signup" />);
    await fillAndSubmit("Create account");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Check your email",
    );
  });
});
