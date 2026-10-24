import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourseForm } from "@/components/courses/course-form";
import userEvent from "@testing-library/user-event";


describe("CourseForm", () => {

    it("renders all the course fields and the submit button", () => {

        const action = vi.fn();
        render(<CourseForm action={action} />);

        expect(screen.getByLabelText("Course Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Course Code")).toBeInTheDocument();
        expect(screen.getByLabelText("Credits")).toBeInTheDocument();
        expect(screen.getByLabelText("Status")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Add Course" })
        ).toBeInTheDocument();
    });

    it("allows the user to enter course information in the form", async () => {
        const action = vi.fn();
        render(<CourseForm action={action} />);

        await userEvent.type(
            screen.getByLabelText("Course Name"),
            "Software Engineering"
        );

        expect(screen.getByLabelText("Course Name")).toHaveValue("Software Engineering");

        await userEvent.type(
            screen.getByLabelText("Course Code"),
            "COMP-4312"
        );

        expect(screen.getByLabelText("Course Code")).toHaveValue("COMP-4312");

        await userEvent.type(
            screen.getByLabelText("Credits"),
            "1"
        );

        expect(screen.getByLabelText("Credits")).toHaveValue(1);

        await userEvent.click(
            screen.getByLabelText("Status"),
        );

        await userEvent.click(
            await screen.findByRole("option", {name: "Completed" })
        );

        expect(
            screen.getByLabelText("Status")
        ).toHaveTextContent("Completed");
    });


    it("submits the course information to the action", async() => {
        const action = vi.fn(async (previousState, _formData: FormData) => ({}));
        render(<CourseForm action={action} />);

        await userEvent.type(
            screen.getByLabelText("Course Name"),
            "Software Engineering"
        );


        await userEvent.type(
            screen.getByLabelText("Course Code"),
            "COMP-4312"
        );

        await userEvent.type(
            screen.getByLabelText("Credits"),
            "1"
        );

        await userEvent.click(
            screen.getByLabelText("Status"),
        );

        await userEvent.click(
            await screen.findByRole("option", {name: "Completed" })
        );

        await userEvent.click(
            screen.getByRole("button", {name: "Add Course" })
        );

        expect(action).toHaveBeenCalled();
        const submittedData = action.mock.calls.at(-1)![1] as FormData;
        expect(submittedData.get("course_name")).toBe("Software Engineering");
        expect(submittedData.get("course_code")).toBe("COMP-4312");
        expect(submittedData.get("credits")).toBe("1");
        expect(submittedData.get("status")).toBe("completed");
    });
});