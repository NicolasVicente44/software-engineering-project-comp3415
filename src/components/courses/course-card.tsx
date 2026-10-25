"use client"
import type { Course } from "@/types/course";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button"
import { CourseDeleteButton } from "@/components/courses/course-delete-button";
import { useActionState } from "react";
import { deleteCourse, type CourseActionState } from "@/lib/courses/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CourseCardProps = {
    course: Course;
};

export function CourseCard({course}: CourseCardProps) {
    const initialState: CourseActionState = {};

    const [state, formAction, pending] = useActionState(
        async (previousState: CourseActionState) => {
            void previousState;
            return await deleteCourse(course.id);
        },
        initialState
    );
    return (
        <Card className="mt-5 w-1/2">
            <CardHeader>
                <CardTitle>{course.course_name}</CardTitle>
                <CardDescription>{course.course_code}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <div>
                    <p>Credits: {course.credits}</p>
                    <p>Status: {course.status === "in_progress" ? "In Progress": course.status.charAt(0).toUpperCase() + course.status.slice(1)} </p> 
                </div>

            <div className="flex gap-2">
                <Link href={`/courses/${course.id}/edit`} className={buttonVariants({variant: "default", className: "rounded-xl"})}> 
                    Edit Course
                </Link>

                <CourseDeleteButton courseName={course.course_name} formAction={formAction} pending={pending}/>
            </div>
            </CardContent>

            {state.error && (
                <Alert variant="destructive" className="mx-6 mb-4 mt-1 border-0 bg-transparent p-0">
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
        )}
        </Card>
    )
}