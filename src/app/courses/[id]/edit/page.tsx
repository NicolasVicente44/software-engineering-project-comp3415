import { notFound } from "next/navigation";
import { CourseForm } from "@/components/courses/course-form";
import { Navbar } from "@/components/navbar";
import { updateCourse } from "@/lib/courses/actions";
import { createClient } from "@/lib/supabase/server";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

type EditCourseProps = {params: Promise<{ id: string }>;};

export default async function EditCourse({ params }: EditCourseProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        notFound();
    }

    const { data: course, error } = await supabase
        .from("student_courses")
        .select("id, course_name, course_code, credits, status")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (error || !course) {
        notFound();
    }

    return (
        <div className="flex flex-1 flex-col">
            <Navbar />

            <main className="mx-auto w-full max-w-2xl px-4 py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Update Course</CardTitle>
                        <CardDescription>
                            Update an existing course on your profile.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <CourseForm
                            action={updateCourse}
                            course={course}
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}