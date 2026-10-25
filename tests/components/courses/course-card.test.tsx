import { render, screen } from "@testing-library/react";
import { describe, expect, it} from "vitest";
import { CourseCard } from "@/components/courses/course-card";

const course = {
    id: "1234",
    user_id: "user-1234",
    course_name: "Software Engineering",
    course_code: "COMP-4312",
    credits: 1,
    status: "completed" as const,
    created_at: "2026-10-24",
};

describe("CourseCard", () => {

    it("displays the course information", () => {
        render(<CourseCard course={course} />);

        expect(screen.getByText("Software Engineering")).toBeInTheDocument();
        expect(screen.getByText("COMP-4312")).toBeInTheDocument();
        expect(screen.getByText("Credits: 1")).toBeInTheDocument();
        expect(screen.getByText("Status: Completed")).toBeInTheDocument();
    });

    it("displays the edit and delete controls", () => {
        render(<CourseCard course={course} />);

        expect(
            screen.getByRole("link", { name: "Edit Course" })
        ).toHaveAttribute("href", "/courses/1234/edit");

        expect(
            screen.getByRole("button", { name: "Delete Course" })
        ).toBeInTheDocument();
    });
});

