"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CourseActionState = {
    error?: string;
};

export async function createCourse(_previousState: CourseActionState, formData: FormData) {
    const supabase = await createClient();

    const {data: {user}, } = await supabase.auth.getUser(); // assigning to logged in user

    if (!user) {
        return {
            error: "You must be signed in to add a course."
        };
    }

    const courseName = formData.get("course_name"); // grabbing form data
    const courseCode = formData.get("course_code");
    const credits = formData.get("credits");
    const status = formData.get("status");

    // validatation of form data
    if (typeof courseName !== "string" || courseName.trim() === "") {
        return {
            error: "Course name must be suitable and is required."
        };
    }
    if (typeof courseCode !== "string" || courseCode.trim() === "") {
        return {
            error: "Course code must be suitable and is required."
        };
    }

    if (typeof credits !== "string" || credits.trim() === "") {
        return {
            error: "Number of credits must be suitable and is required."
        };
    }
    const creditsAsNumber = Number(credits);
    if (!Number.isFinite(creditsAsNumber) || creditsAsNumber <= 0) {
        return {
            error: "Number of credits must be a positive number."
        };
    }

    const statusTypes = ["completed", "in_progress", "dropped", "failed"];
    if (typeof status !== "string" || !statusTypes.includes(status)) {
        return {
            error: "Status must be completed, in_progress, dropped, or failed."
        };
    }
    
    const {error} = await supabase.from("student_courses").insert( // database insert
        {
            user_id: user.id,
            course_name: courseName.trim(),
            course_code: courseCode.trim(),
            credits: creditsAsNumber,
            status: status
        }
    )

    if (error) {
        console.error("Failed to create course: ", error);

        return {
            error: "Unable to add course. Please try again."
        };
    }
    redirect("/courses");   
}


// update is WIP, will be done soon and will fix any warnings
export async function updateCourse(_previousState: CourseActionState, formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            error: "You must be signed in to update a course."
        };
    }

    redirect("/courses");
}

export async function deleteCourse(courseId: string): Promise<void>  {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be signed in to delete a course.");
    }

    if (!courseId || courseId.trim() === "") {
        throw new Error("A course ID is required.");
    }

    const { data, error } = await supabase
        .from("student_courses")
        .delete()
        .eq("id", courseId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

    if (error) {
        console.error("Failed to delete course:", error);
        throw new Error("Unable to delete course. Please try again.");
    }

    if (!data) {
        throw new Error(
            "Course not found or you do not have permission to delete it."
        );
    }

    redirect("/courses");
}
