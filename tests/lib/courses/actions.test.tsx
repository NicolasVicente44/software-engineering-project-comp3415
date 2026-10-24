import { describe, expect, it, vi } from "vitest";
import { createCourse, deleteCourse, updateCourse} from "@/lib/courses/actions";

const { createClient, redirect } = vi.hoisted(() => ({
    createClient: vi.fn(),
    redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient,
}));

vi.mock("next/navigation", () => ({
    redirect,
}));

describe("createCourse", () => {
    it("error is returned when the user is not signed in", async () => {
        
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: null
            }
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
        });

        const formData = new FormData();
        const result = await createCourse({}, formData);
        expect(result).toEqual({
            error: "You must be signed in to add a course."
        });
    });

    it("valid information is given by logged in user and course is created", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        const insert = vi.fn().mockResolvedValue({
            error: null
        });

        const from = vi.fn().mockReturnValue({
            insert,
        });


        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
            from,
        });

        const formData = new FormData();
        formData.set("course_name", "Software Engineering");
        formData.set("course_code", "COMP-4312");
        formData.set("credits", "1");
        formData.set("status", "completed");

        await createCourse({}, formData);

        expect(insert).toHaveBeenCalledWith({
            user_id: "user-1234",
            course_name: "Software Engineering",
            course_code: "COMP-4312",
            credits: 1,
            status: "completed"
        });

        expect(from).toHaveBeenCalledWith("student_courses");
        expect(redirect).toHaveBeenCalledWith("/courses");
    });

    it("error is returned when course name is empty", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
        });

        const formData = new FormData();
        formData.set("course_name", "");
        formData.set("course_code", "COMP-4312");
        formData.set("credits", "1");
        formData.set("status", "completed");

        const result = await createCourse({}, formData);

        expect(result).toEqual({
            error: "Course name must be suitable and is required."
        });
    });

    it("error is returned when course code is empty", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
        });

        const formData = new FormData();
        formData.set("course_name", "Software Engineering");
        formData.set("course_code", "");
        formData.set("credits", "1");
        formData.set("status", "completed");

        const result = await createCourse({}, formData);

        expect(result).toEqual({
            error: "Course code must be suitable and is required."
        });
    });


    it("error is returned when credit number is invalid", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
        });

        const formData = new FormData();
        formData.set("course_name", "Software Engineering");
        formData.set("course_code", "COMP-4312");
        formData.set("credits", "-1");
        formData.set("status", "completed");

        const result = await createCourse({}, formData);

        expect(result).toEqual({
            error: "Number of credits must be a positive number."
        });

        
    });


    it("error is returned when course status is invalid", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
        });

        const formData = new FormData();
        formData.set("course_name", "Software Engineering");
        formData.set("course_code", "COMP-4312");
        formData.set("credits", "1");
        formData.set("status", "not_a_status");

        const result = await createCourse({}, formData);

        expect(result).toEqual({
            error: "Status must be completed, in_progress, dropped, or failed."
        });
    });

    
    it("error is returned when database insert has failed", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        const insert = vi.fn().mockResolvedValue({
            error: {
                message: "Error in database"
            }
        });

        const from = vi.fn().mockReturnValue({
            insert,
        });


        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
            from,
        });

        const formData = new FormData();
        formData.set("course_name", "Software Engineering");
        formData.set("course_code", "COMP-4312");
        formData.set("credits", "1");
        formData.set("status", "completed");

        const result = await createCourse({}, formData);

        expect(result).toEqual({
            error: "Unable to add course. Please try again."
        });
    });
});

describe("deleteCourse", () => {
    it("error is thrown when the user is not signed in", async () => {  
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: null
            }
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
        });

        await expect(
            deleteCourse("fake-course")
        ).rejects.toThrow("You must be signed in to delete a course.");
    });

    it("course is deleted when valid course ID is given by user that is logged in", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        const maybeSingle = vi.fn().mockResolvedValue({
            data: {
                id: "fake-course"
            },
            error: null
        });

        const select = vi.fn().mockReturnValue({
            maybeSingle,
        });

        const secondEq = vi.fn().mockReturnValue({
            select,
        });

        const firstEq = vi.fn().mockReturnValue({
            eq: secondEq,
        });

        const deleteQuery = vi.fn().mockReturnValue({
            eq: firstEq,
        });

        const from = vi.fn().mockReturnValue({
            delete: deleteQuery,
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
            from,
        });

        await deleteCourse("fake-course");

        expect(from).toHaveBeenCalledWith("student_courses");
        expect(firstEq).toHaveBeenCalledWith("id", "fake-course");
        expect(secondEq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(redirect).toHaveBeenCalledWith("/courses");
    });

    it("error is thrown when course ID is empty", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
        });

        await expect(
            deleteCourse("")
        ).rejects.toThrow("A course ID is required.");
    });

    it("course id is not found or permission is not granted", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        const maybeSingle = vi.fn().mockResolvedValue({
            data: null,
            error: null
        });

        const select = vi.fn().mockReturnValue({
            maybeSingle,
        });

        const secondEq = vi.fn().mockReturnValue({
            select,
        });

        const firstEq = vi.fn().mockReturnValue({
            eq: secondEq,
        });

        const deleteQuery = vi.fn().mockReturnValue({
            eq: firstEq,
        });

        const from = vi.fn().mockReturnValue({
            delete: deleteQuery,
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
            from,
        });

        await expect(
            deleteCourse("fake-course")
        ).rejects.toThrow("Course not found or you do not have permission to delete it.");
    });

    
    it("error is thrown when database delete failed", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "user-1234"
                }
            }
        });

        const maybeSingle = vi.fn().mockResolvedValue({
            data: null,
            error: {
                message: "Error in database"
            }
        });

        const select = vi.fn().mockReturnValue({
            maybeSingle,
        });

        const secondEq = vi.fn().mockReturnValue({
            select,
        });

        const firstEq = vi.fn().mockReturnValue({
            eq: secondEq,
        });

        const deleteQuery = vi.fn().mockReturnValue({
            eq: firstEq,
        });

        const from = vi.fn().mockReturnValue({
            delete: deleteQuery,
        });

        createClient.mockResolvedValue({
            auth: {
                getUser,
            },
            from,
        });

        await expect(
            deleteCourse("fake-course")
        ).rejects.toThrow("Unable to delete course. Please try again.");
    });
});