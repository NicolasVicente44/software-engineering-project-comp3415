"use client";


import { Button } from "@/components/ui/button";

type CourseDeleteButtonProps = {
    courseName: string;
    formAction: (formData: FormData) => void;
    pending: boolean;
};

export function CourseDeleteButton({courseName,formAction,pending}: CourseDeleteButtonProps) {
    return (
        <div className="flex flex-col items-end gap-2">
            <form
                action={formAction}
                onSubmit={(event) => {
                    if (!window.confirm(
                        `Are you sure you want to delete "${courseName}"? This action cannot be undone.`)
                    ) {
                        event.preventDefault();
                    }
                }}>
                <Button type="submit" variant="destructive" className="rounded-xl" disabled={pending}>
                    {pending ? "Deleting..." : "Delete Course"}
                </Button>
            </form>
        </div>
    );
}