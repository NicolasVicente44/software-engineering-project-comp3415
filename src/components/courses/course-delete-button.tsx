"use client";

import { Button } from "@/components/ui/button";
import { getAnyDependentCourses } from "@/lib/courses/actions"
import { startTransition } from "react";

type CourseDeleteButtonProps = {
    courseId: string;
    courseName: string;
    formAction: (formData: FormData) => void;
    pending: boolean;
};

export function CourseDeleteButton({courseId,courseName,formAction,pending}: CourseDeleteButtonProps) {
    return (
        <div className="flex flex-col items-end gap-2">
            <form
                action={formAction}
                onSubmit={async (event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const dependentCourses = await getAnyDependentCourses(courseId);
                    if(dependentCourses === null) {
                        window.alert("Cannot check course dependencies at this moment. Please try again.");
                        return;
                    }
                    let message = "";
                    if (dependentCourses.length > 0) { // ac-4 showing the dependent courses and making the user confirm first
                        message = `The following courses depend on ${courseName}:\n${dependentCourses.join(", ")}\nDo you confirm that you want to delete this course?`
                    } else {
                        message = `Are you sure you want to delete "${courseName}"? This action cannot be undone.`
                    }
                    if (!window.confirm(message)) {
                        return;
                    }

                    const formData = new FormData(form);
                    formData.set("confirmed", "true");
                    startTransition(() => {
                        formAction(formData);
                    })
                }}>
                <Button type="submit" variant="destructive" className="rounded-xl" disabled={pending}>
                    {pending ? "Deleting..." : "Delete Course"}
                </Button>
            </form>
        </div>
    );
}