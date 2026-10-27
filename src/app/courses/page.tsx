import { Navbar } from "@/components/navbar";
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { redirect } from "next/navigation";
import { CourseCard} from "@/components/courses/course-card";

import {
    Alert,
    AlertDescription
} from "@/components/ui/alert";

import { createClient } from "@/lib/supabase/server";

export default async function CoursesView() {
    const supabase = await createClient();

    const {data: {user}, } = await supabase.auth.getUser(); // assigning to logged in user

    if (!user) {
        redirect("/login"); 
    }

    const {data: courses, error} = await supabase.from("student_courses")
    .select("*")
    .eq("user_id", user.id); // all courses for this specific user

    if (error) {
        console.error("Failed to load courses: ", error)
    }

    return (
    <div className="flex flex-1 flex-col">
        <Navbar/>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
            <h1 className="text-2xl font-semibold">My Courses</h1>

                <Link href="/courses/add" className={buttonVariants({variant: "default", className: "mt-4 rounded-xl"})}>
                    Add Course
                </Link>

                {error && ( // error alert message
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                            Unable to load your courses. Please try again.
                        </AlertDescription>
                    </Alert>
                )}

                {courses?.map((course) => ( // mapping the courses to cards
                    <CourseCard key={course.id} course={course}/>
                ))}
        </main>
    </div>
    );
}