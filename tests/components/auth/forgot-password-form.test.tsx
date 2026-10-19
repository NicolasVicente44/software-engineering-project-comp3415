import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { requestPasswordReset } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock("@/lib/auth/actions", () => ({ requestPasswordReset }));

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

describe("ForgotPasswordForm", () => {
  it("renders an email field and submit button", () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send reset link" }),
    ).toBeInTheDocument();
  });

  it("submits the email and shows the confirmation message", async () => {
    requestPasswordReset.mockResolvedValue({
      message: "If an account exists for that email, we sent a link.",
    });
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: "Send reset link" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists",
    );
    const submitted = requestPasswordReset.mock.calls.at(-1)![1] as FormData;
    expect(submitted.get("email")).toBe("user@example.com");
  });

  it("shows an error returned by the action", async () => {
    requestPasswordReset.mockResolvedValue({
      error: "Too many emails requested. Please wait a few minutes and try again.",
    });
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: "Send reset link" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many");
  });
});
