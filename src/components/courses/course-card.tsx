import type { Course } from "@/types/course";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button"
import { CourseDeleteButton } from "@/components/courses/course-delete-button";

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

                <CourseDeleteButton courseId={course.id} courseName={course.course_name}/>
            </div>
            </CardContent>
        </Card>
    )
}