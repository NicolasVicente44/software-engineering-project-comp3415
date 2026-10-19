import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { signIn, signUp } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/auth/actions", () => ({ signIn, signUp }));

import { LoginForm } from "@/components/auth/login-form";

async function fillAndSubmit(buttonName: string, confirm = "password123") {
  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  const confirmField = screen.queryByLabelText("Confirm password");
  if (confirmField) await userEvent.type(confirmField, confirm);
  await userEvent.click(screen.getByRole("button", { name: buttonName }));
}

describe("LoginForm (sign in)", () => {
  it("renders sign-in fields and button", () => {
    render(<LoginForm mode="signin" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("does not ask for a password confirmation", () => {
    render(<LoginForm mode="signin" />);
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("links to the forgot password page", () => {
    render(<LoginForm mode="signin" />);
    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("shows the error returned by the action", async () => {
    signIn.mockResolvedValue({ error: "Incorrect email or password." });
    render(<LoginForm mode="signin" />);
    await fillAndSubmit("Sign in");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect email or password.",
    );
  });
});

describe("LoginForm (sign up)", () => {
  it("renders email, password and confirm password fields", () => {
    render(<LoginForm mode="signup" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("does not show a forgot password link", () => {
    render(<LoginForm mode="signup" />);
    expect(
      screen.queryByRole("link", { name: "Forgot password?" }),
    ).not.toBeInTheDocument();
  });

  it("shows a strength hint that updates as the user types", async () => {
    render(<LoginForm mode="signup" />);
    expect(screen.getByText(/use at least 8 characters/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Password"), "abc");
    expect(screen.getByText("Password strength: Too short")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Password"));
    await userEvent.type(screen.getByLabelText("Password"), "Abcdefghijk1!");
    expect(screen.getByText("Password strength: Strong")).toBeInTheDocument();
  });

  it("submits to the sign-up action and shows the confirmation message", async () => {
    signUp.mockResolvedValue({
      message: "Check your email to confirm your account.",
    });
    render(<LoginForm mode="signup" />);
    await fillAndSubmit("Create account");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Check your email",
    );
    const submitted = signUp.mock.calls.at(-1)![1] as FormData;
    expect(submitted.get("confirmPassword")).toBe("password123");
  });

  it("shows an error returned by the action", async () => {
    signUp.mockResolvedValue({ error: "Passwords do not match." });
    render(<LoginForm mode="signup" />);
    await fillAndSubmit("Create account", "different123");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match.",
    );
  });
});
