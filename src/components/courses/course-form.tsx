"use client";
import { useActionState } from "react";
import type { CourseActionState } from "@/lib/courses/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Alert, AlertDescription} from "@/components/ui/alert";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Course = {
    id: string;
    course_name: string;
    course_code: string;
    credits: number;
    status: "completed" | "in_progress" | "dropped" | "failed";
};

type CourseFormProps = {
    action: (previousState: CourseActionState,
        formData: FormData
    ) => Promise<CourseActionState>;
    course?: Course;
};

export function CourseForm({ action, course  }: CourseFormProps) {
    const initialState: CourseActionState = {};
    const [state, formAction, pending] = useActionState(action, initialState);
    const isEditing = !!course;
    return (
        <form action={formAction} className="flex flex-col gap-4">
            {course && (<input type="hidden" name="id" value={course.id} />)}

            <div className="flex flex-col gap-2">
                <Label htmlFor="course_name">Course Name</Label>
                <Input id="course_name" name="course_name" type="text" required placeholder="Software Engineering" defaultValue={course?.course_name ?? ""}/>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="course_code">Course Code</Label>
                <Input id="course_code" name="course_code" type="text" required placeholder="COMP-3415" defaultValue={course?.course_code ?? ""}/>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="credits">Credits</Label>
                <Input id="credits" name="credits" type="number" required placeholder="0.5" min="0" step="0.01" defaultValue={course?.credits ?? ""}/>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" required defaultValue={course?.status}>
                    <SelectTrigger id="status" className="w-full">
                        <SelectValue placeholder="Choose a status"/>
                    </SelectTrigger>

                {/* is based off of enum built in supabase */}
                    <SelectContent> 
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button type="submit" disabled={pending} className="w-1/2"> 
                {pending
                    ? isEditing
                        ? "Updating course..."
                        : "Adding course..."
                    : isEditing
                        ? "Update Course"
                        : "Add Course"
                }
            </Button>

            {state.error && ( // shows error state
                <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}
        </form>
    );
}
