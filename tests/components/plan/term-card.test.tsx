import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TermCard } from "@/components/plan/term-card";

const course = (code: string, extra: Record<string, unknown> = {}) => ({
    code,
    name: `${code} name`,
    credits: 0.5,
    status: "in_progress",
    moved: false,
    ...extra,
});

describe("TermCard (us-05)", () => {
    it("shows each course with its name and credits, and the term total", () => {
        render(
            <TermCard
                term={2}
                courses={[course("COMP-1000"), course("COMP-2000", { credits: 1 })]}
                creditLimit={2}
            />
        );

        expect(screen.getByText("Term 2")).toBeInTheDocument();
        expect(screen.getByText("COMP-1000 name")).toBeInTheDocument();
        expect(screen.getByText("1 cr")).toBeInTheDocument();
        expect(screen.getByText("1.5 of 2 credits")).toBeInTheDocument();
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "75");
    });

    it("labels retakes and moved courses", () => {
        render(
            <TermCard
                term={1}
                courses={[course("COMP-1000", { status: "failed", moved: true }), course("COMP-2000", { status: "dropped" })]}
                creditLimit={2.5}
            />
        );

        expect(screen.getByText("Retake · failed")).toBeInTheDocument();
        expect(screen.getByText("Retake · dropped")).toBeInTheDocument();
        expect(screen.getAllByText("Moved")).toHaveLength(1);
    });

    it("says when a term has no courses", () => {
        render(<TermCard term={1} courses={[]} creditLimit={2.5} />);

        expect(screen.getByText("No courses this term.")).toBeInTheDocument();
    });
});
