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

    // validation of form data
    if (typeof courseName !== "string" || courseName.trim() === "" || !/[A-Za-z]/.test(courseName)) {
        return {
            error: "Course name can not be empty and must contain at least one letter."
        };
    }
    if (typeof courseCode !== "string" || courseCode.trim() === "" || !/^[A-Za-z]{4}-\d{4}$/.test(courseCode.trim())) {
        return {
            error: "Course code must be in the format ABCD-#### and is required."
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

export async function updateCourse(_previousState: CourseActionState,formData: FormData): Promise<CourseActionState> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            error: "You must be signed in to update a course."
        };
    }

    const courseId = formData.get("id");
    const courseName = formData.get("course_name");
    const courseCode = formData.get("course_code");
    const credits = formData.get("credits");
    const status = formData.get("status");

    // validation of form data
    if (typeof courseId !== "string" || courseId.trim() === "") {
        return {
            error: "A valid course ID is required."
        };
    }

    if (typeof courseName !== "string" || courseName.trim() === "" || !/[A-Za-z]/.test(courseName)) {
        return {
            error: "Course name can not be empty and must contain at least one letter."
        };
    }
    if (typeof courseCode !== "string" || courseCode.trim() === "" || !/^[A-Za-z]{4}-\d{4}$/.test(courseCode.trim())) {
        return {
            error: "Course code must be in the format ABCD-#### and is required."
        };
    }

    if (typeof credits !== "string" || credits.trim() === "") {
        return {
            error: "Number of credits is required."
        };
    }

    const creditsAsNumber = Number(credits);

    if (!Number.isFinite(creditsAsNumber) || creditsAsNumber <= 0) {
        return {
            error: "Number of credits must be a positive number."
        };
    }

    const statusTypes = [
        "completed",
        "in_progress",
        "dropped",
        "failed"
    ];

    if (typeof status !== "string" || !statusTypes.includes(status)) {
        return {
            error: "Please select a valid course status."
        };
    }

    // Update only the course belonging to the logged-in user
    const { data, error } = await supabase
        .from("student_courses")
        .update({
            course_name: courseName.trim(),
            course_code: courseCode.trim(),
            credits: creditsAsNumber,
            status: status
        })
        .eq("id", courseId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

    if (error) {
        console.error("Failed to update course:", error);

        return {
            error: "Unable to update course. Please try again."
        };
    }

    if (!data) {
        return {
            error: "Course not found or you do not have permission to update it."
        };
    }

    redirect("/courses");
}

export async function deleteCourse(courseId: string): Promise<CourseActionState>  {
    const supabase = await createClient();
    const {data: { user }} = await supabase.auth.getUser();

    if (!user) {
        return {
            error: "You must be signed in to delete a course."
        };
    }

    if (!courseId || courseId.trim() === "") {
        return {
            error: "A course ID is required."
        };
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
        return {
            error: "Unable to delete course. Please try again."
        };

    }

    if (!data) {
        return {
            error: "Course not found or you do not have permission to delete it."
        };
    }

    redirect("/courses");
}
