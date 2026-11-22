import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangeEmailForm } from "@/components/profile/change-email-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { PlanningSettingsForm } from "@/components/profile/planning-settings-form";
import { ProfileDetailsForm } from "@/components/profile/profile-details-form";

describe("ProfileDetailsForm (us-11)", () => {
    it("shows the student's saved details", () => {
        render(
            <ProfileDetailsForm
                action={vi.fn().mockResolvedValue({})}
                fullName="Jane Doe"
                school="Lakehead University"
                program="Computer Science"
            />
        );

        expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe");
        expect(screen.getByLabelText("School")).toHaveValue("Lakehead University");
        expect(screen.getByLabelText("Program")).toHaveValue("Computer Science");
    });

    it("submits the entered details and shows a success message", async () => {
        const action = vi.fn().mockResolvedValue({ message: "Your profile was saved." });
        render(<ProfileDetailsForm action={action} fullName="" school="" program="" />);

        await userEvent.type(screen.getByLabelText("Name"), "Jane");
        await userEvent.click(screen.getByRole("button", { name: "Save Profile" }));

        expect(await screen.findByText("Your profile was saved.")).toBeInTheDocument();
        const formData: FormData = action.mock.calls[0][1];
        expect(formData.get("full_name")).toBe("Jane");
    });

    it("keeps the entered values when saving returns an error", async () => {
        const action = vi.fn().mockResolvedValue({ error: "Unable to save your profile. Please try again." });
        render(<ProfileDetailsForm action={action} fullName="" school="" program="" />);

        await userEvent.type(screen.getByLabelText("School"), "Lakehead");
        await userEvent.click(screen.getByRole("button", { name: "Save Profile" }));

        expect(await screen.findByText("Unable to save your profile. Please try again.")).toBeInTheDocument();
        expect(screen.getByLabelText("School")).toHaveValue("Lakehead");
    });
});

describe("PlanningSettingsForm (us-06, us-11)", () => {
    it("shows the saved credit limit and credits to graduate", () => {
        render(<PlanningSettingsForm action={vi.fn().mockResolvedValue({})} creditLimit={1.5} creditsToGraduate={20} />);

        expect(screen.getByLabelText("Credit limit per term")).toHaveValue(1.5);
        expect(screen.getByLabelText("Credits needed to graduate")).toHaveValue(20);
    });

    it("leaves credits to graduate empty when not set", () => {
        render(<PlanningSettingsForm action={vi.fn().mockResolvedValue({})} creditLimit={2.5} creditsToGraduate={null} />);

        expect(screen.getByLabelText("Credits needed to graduate")).toHaveValue(null);
    });

    it("keeps an invalid entered limit and shows the error", async () => {
        const action = vi.fn().mockResolvedValue({
            error: "Credit limit must be a number greater than 0 and at most 10."
        });
        render(<PlanningSettingsForm action={action} creditLimit={2.5} creditsToGraduate={null} />);

        const input = screen.getByLabelText("Credit limit per term");
        await userEvent.clear(input);
        await userEvent.type(input, "-1");
        await userEvent.click(screen.getByRole("button", { name: "Save Planning Settings" }));

        expect(
            await screen.findByText("Credit limit must be a number greater than 0 and at most 10.")
        ).toBeInTheDocument();
        expect(input).toHaveValue(-1);
        const formData: FormData = action.mock.calls[0][1];
        expect(formData.get("credit_limit")).toBe("-1");
    });
});

describe("ChangeEmailForm (us-11)", () => {
    it("shows the current email and submits the new one", async () => {
        const action = vi.fn().mockResolvedValue({ message: "We sent a confirmation link to new@example.com." });
        render(<ChangeEmailForm action={action} email="student@example.com" />);

        expect(screen.getByText("student@example.com")).toBeInTheDocument();
        await userEvent.type(screen.getByLabelText("New email"), "new@example.com");
        await userEvent.click(screen.getByRole("button", { name: "Change Email" }));

        expect(await screen.findByText(/confirmation link to new@example.com/)).toBeInTheDocument();
        const formData: FormData = action.mock.calls[0][1];
        expect(formData.get("email")).toBe("new@example.com");
    });
});

describe("ChangePasswordForm (us-11)", () => {
    it("submits the current and new passwords and shows an error", async () => {
        const action = vi.fn().mockResolvedValue({ error: "Your current password is incorrect." });
        render(<ChangePasswordForm action={action} />);

        await userEvent.type(screen.getByLabelText("Current password"), "oldpassword");
        await userEvent.type(screen.getByLabelText("New password"), "newpassword1");
        await userEvent.type(screen.getByLabelText("Confirm password"), "newpassword1");
        await userEvent.click(screen.getByRole("button", { name: "Change Password" }));

        expect(await screen.findByText("Your current password is incorrect.")).toBeInTheDocument();
        const formData: FormData = action.mock.calls[0][1];
        expect(formData.get("currentPassword")).toBe("oldpassword");
        expect(formData.get("password")).toBe("newpassword1");
        expect(formData.get("confirmPassword")).toBe("newpassword1");
    });

    it("clears the new password after it is changed", async () => {
        const action = vi.fn().mockResolvedValue({ message: "Your password was changed." });
        render(<ChangePasswordForm action={action} />);

        await userEvent.type(screen.getByLabelText("Current password"), "oldpassword");
        await userEvent.type(screen.getByLabelText("New password"), "newpassword1");
        await userEvent.type(screen.getByLabelText("Confirm password"), "newpassword1");
        await userEvent.click(screen.getByRole("button", { name: "Change Password" }));

        expect(await screen.findByText("Your password was changed.")).toBeInTheDocument();
        expect(screen.getByLabelText("New password")).toHaveValue("");
    });
});
