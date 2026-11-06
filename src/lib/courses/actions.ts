"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkPrerequisites, normalizeCourseCode, findDependentCourses, findMissingPrerequisitesInCourseList} from "@/lib/prerequisites/check";

export type CourseActionState = {
    error?: string;
};

const prerequisiteRegex = /^[A-Za-z]{4}-\d{4}(\s*,\s*[A-Za-z]{4}-\d{4})*$/;

function parsePrerequisites(value: string): string[] {
    return value.split(",").map(code => normalizeCourseCode(code)).filter(code => code !== "");
}

// fetches the students courses with their prereqs to be used in later functions
async function getStudentCoursesForPrerequisites(userId: string) {
    const supabase = await createClient();

    return supabase
        .from("student_courses")
        .select("course_code, prerequisites")
        .eq("user_id", userId);
}

// get the required info for findDependentCourses to be able to search for the courses that an attempted deleted course is needed for
export async function getAnyDependentCourses(courseId: string): Promise<string[] | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if(!user || !courseId.trim()) {
        return null;
    }

    const { data: studentCourses, error} = await supabase
        .from("student_courses")
        .select("id, course_code, prerequisites")
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to load courses: ", error);
        return null;
    }

    const targetCourse = studentCourses?.find(course => course.id === courseId);

    if (!targetCourse) {
        return null;
    }

    return findDependentCourses(targetCourse.course_code, studentCourses ?? []);

}

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
    const prerequisiteInputs = formData.get("prerequisites");

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

    // follows ABCD-####,EFGH-#### format
    if (typeof prerequisiteInputs !== "string" || (prerequisiteInputs.trim() !== "" && !prerequisiteRegex.test(prerequisiteInputs.trim()))) {
        return {
            error: "Invalid prerequisite input. It must be in COMP-2412, CALC-1311 format if there are multiple prerequisites."
        };
    }

    const prerequisites = parsePrerequisites(prerequisiteInputs);

    // make sure that the prereqs do not include the current course itself
    if (prerequisites.includes(normalizeCourseCode(courseCode))) {
        return {
            error: "A course cannot be the prerequisite to itself."
        }
    }

    const { data: studentCourses, error: queryError } =
        await getStudentCoursesForPrerequisites(user.id);

    if (queryError) {
        console.error("Failed to load courses: ", queryError);
        return {
            error: "There was an issue with validating your prerequisites. Please try again."
        };
    }

    const missingPrerequisites = findMissingPrerequisitesInCourseList(
        prerequisites,
        studentCourses ?? []
    );

    // any prerequisite found here is not in the course list already, and needs to be added first
    if (missingPrerequisites.length > 0) {
        return {
            error: `Prerequisite courses not found: ${missingPrerequisites.join(", ")}. Please add them first then try again.`
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

    // block in-progress course if prerequisites are missing (us-03)
    if (status === "in_progress") {
        const { data: studentCourses, error: queryError } = await supabase
            .from("student_courses")
            .select("course_code, status")
            .eq("user_id", user.id);

        if (queryError) {
            console.error("Failed to check prerequisites: ", queryError);
            return {
                error: "Could not check prerequisites."
            };
        }

        const result = checkPrerequisites(courseCode, studentCourses ?? [], {[normalizeCourseCode(courseCode)]: prerequisites});
        if (!result.eligible) {
            return {
                error: `Missing prerequisites: ${result.missing.join(", ")}`
            };
        }
    }
    
    const {error} = await supabase.from("student_courses").insert( // database insert
        {
            user_id: user.id,
            course_name: courseName.trim(),
            course_code: courseCode.trim(),
            credits: creditsAsNumber,
            status: status,
            prerequisites: prerequisites
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
    const prerequisiteInputs = formData.get("prerequisites");

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

    if (typeof prerequisiteInputs !== "string" || (prerequisiteInputs.trim() !== "" && !prerequisiteRegex.test(prerequisiteInputs.trim()))) {
        return {
            error: "Invalid prerequisite input. It must be in COMP-2412, CALC-1311 format if there are multiple prerequisites."
        };
    }

    const prerequisites = parsePrerequisites(prerequisiteInputs);

    if (prerequisites.includes(normalizeCourseCode(courseCode))) {
        return {
            error: "A course cannot be the prerequisite to itself."
        }
    }

    const { data: studentCourses, error: queryError } =
        await getStudentCoursesForPrerequisites(user.id);

    if (queryError) {
        console.error("Failed to load courses: ", queryError);
        return {
            error: "There was an issue with validating your prerequisites. Please try again."
        };
    }

    const missingPrerequisites = findMissingPrerequisitesInCourseList(
        prerequisites,
        studentCourses ?? []
    );

    if (missingPrerequisites.length > 0) {
        return {
            error: `Prerequisite courses not found: ${missingPrerequisites.join(", ")}. Please add them first then try again.`
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

    // only run prereq validation when course is in progress
    if (status === "in_progress") {
        const { data: studentCourses, error: queryError } = await supabase
            .from("student_courses")
            .select("course_code, status")
            .eq("user_id", user.id);
        
        if(queryError) {
            console.error("Failed to check prerequistites", queryError);
            return {
                error: "Could not check prerequisites. Please try again."
            };
        }

        const result = checkPrerequisites(courseCode, studentCourses ?? [], {[normalizeCourseCode(courseCode)]: prerequisites});
        if (!result.eligible) {
            return {
                error: `Missing prerequisites: ${result.missing.join(", ")}`
            };
        }
    }

    // ADD A CHECK HERE TO PREVENT COMPLETED COURSES BEING SET TO OTHER STATUSES IF A DIFFERENT COURSE DEPENDS ON IT

    // Update only the course belonging to the logged-in user
    const { data, error } = await supabase
        .from("student_courses")
        .update({
            course_name: courseName.trim(),
            course_code: courseCode.trim(),
            credits: creditsAsNumber,
            status: status,
            prerequisites: prerequisites
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

export async function deleteCourse(courseId: string, confirmed: boolean = false): Promise<CourseActionState>  {
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

    const dependentCourses = await getAnyDependentCourses(courseId);

    if (dependentCourses === null) {
        return {
            error: "There was an issue with verifying your dependencies. Please try again."
        };
    }

    if (dependentCourses.length > 0 && !confirmed) {
        return {
            error: `This course is required by the following course(s): ${dependentCourses.join(", ")}. Please confirm first whether you want to delete them or not first.`
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
