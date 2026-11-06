import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreditLimitForm } from "@/components/plan/credit-limit-form";

describe("CreditLimitForm", () => {
    it("shows the student's current limit", () => {
        render(<CreditLimitForm action={vi.fn().mockResolvedValue({})} creditLimit={1.5} />);

        expect(screen.getByLabelText("Credit limit per term")).toHaveValue(1.5);
        expect(screen.getByRole("button", { name: "Save Limit" })).toBeInTheDocument();
    });

    it("submits the entered limit and shows an error from the action", async () => {
        const action = vi.fn().mockResolvedValue({ error: "Credit limit is required." });
        render(<CreditLimitForm action={action} creditLimit={2.5} />);

        const input = screen.getByLabelText("Credit limit per term");
        await userEvent.clear(input);
        await userEvent.type(input, "2");
        await userEvent.click(screen.getByRole("button", { name: "Save Limit" }));

        expect(await screen.findByText("Credit limit is required.")).toBeInTheDocument();
        const formData: FormData = action.mock.calls[0][1];
        expect(formData.get("credit_limit")).toBe("2");
    });
});
