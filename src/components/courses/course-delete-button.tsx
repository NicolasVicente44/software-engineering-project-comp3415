"use client";

import { deleteCourse } from "@/lib/courses/actions";
import { Button } from "@/components/ui/button";

type CourseDeleteButtonProps = {
    courseId: string;
    courseName: string;
};

export function CourseDeleteButton({courseId,courseName,}: CourseDeleteButtonProps) {
    return (
        <form
            action={deleteCourse.bind(null, courseId)}
            onSubmit={(event) => {
                if (!window.confirm(
                        "Are you sure you want to delete '${courseName}'? This action cannot be undone.")
                    ) {
                    event.preventDefault();
                }
            }}>

            <Button type="submit" variant="destructive" className="rounded-xl">
                Delete Course
            </Button>
        </form>
    );
}