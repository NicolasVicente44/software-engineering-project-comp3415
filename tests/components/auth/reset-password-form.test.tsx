import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { updatePassword } = vi.hoisted(() => ({ updatePassword: vi.fn() }));

vi.mock("@/lib/auth/actions", () => ({ updatePassword }));

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

describe("ResetPasswordForm", () => {
  it("renders new password and confirm fields", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeInTheDocument();
  });

  it("shows the password strength hint", async () => {
    render(<ResetPasswordForm />);
    await userEvent.type(screen.getByLabelText("New password"), "Abcdefg1");
    expect(screen.getByText("Password strength: Fair")).toBeInTheDocument();
  });

  it("submits both passwords to the action", async () => {
    updatePassword.mockResolvedValue({});
    render(<ResetPasswordForm />);
    await userEvent.type(screen.getByLabelText("New password"), "password123");
    await userEvent.type(
      screen.getByLabelText("Confirm password"),
      "password123",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Update password" }),
    );

    await vi.waitFor(() => expect(updatePassword).toHaveBeenCalled());
    const submitted = updatePassword.mock.calls.at(-1)![1] as FormData;
    expect(submitted.get("password")).toBe("password123");
    expect(submitted.get("confirmPassword")).toBe("password123");
  });

  it("shows an error returned by the action", async () => {
    updatePassword.mockResolvedValue({ error: "Passwords do not match." });
    render(<ResetPasswordForm />);
    await userEvent.type(screen.getByLabelText("New password"), "password123");
    await userEvent.type(
      screen.getByLabelText("Confirm password"),
      "different123",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Update password" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match.",
    );
  });
});
