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
            error: "Course name can not be empty and must contain at least one letter."
        });
    });

    it("error is returned when course name does not contain at least 1 letter", async () => {
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
        formData.set("course_name", "123456");
        formData.set("course_code", "COMP-4312");
        formData.set("credits", "1");
        formData.set("status", "completed");

        const result = await createCourse({}, formData);

        expect(result).toEqual({
            error: "Course name can not be empty and must contain at least one letter."
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
            error: "Course code must be in the format ABCD-#### and is required."
        });
    });

    it("error is returned when course code does not fit AAAA-#### regex", async () => {
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
        formData.set("course_code", "COMP-123");
        formData.set("credits", "1");
        formData.set("status", "completed");

        const result = await createCourse({}, formData);

        expect(result).toEqual({
            error: "Course code must be in the format ABCD-#### and is required."
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

    // in-progress COMP-3415 needs COMP-2412 and COMP-2477 (us-03)
    const mockPrereqQuery = () => {
        const eq = vi.fn().mockResolvedValue({ data: [], error: null });
        const select = vi.fn().mockReturnValue({ eq });
        const insert = vi.fn().mockResolvedValue({ error: null });
        const from = vi.fn().mockReturnValue({ select, insert });

        createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user-1234" } }
                })
            },
            from
        });

        return { eq, insert, from };
    };

    const inProgressFormData = (status = "in_progress") => {
        const formData = new FormData();
        formData.set("course_name", "Software Engineering");
        formData.set("course_code", "COMP-3415");
        formData.set("credits", "1");
        formData.set("status", status);
        return formData;
    };

    it("blocks adding a course when prerequisites are missing", async () => {
        const { eq, insert } = mockPrereqQuery();
        eq.mockResolvedValueOnce({
            data: [{ course_code: "COMP-2412", status: "completed" }],
            error: null
        });

        const result = await createCourse({}, inProgressFormData());

        expect(result).toEqual({
            error: "Missing prerequisites: COMP-2477"
        });
        expect(insert).not.toHaveBeenCalled();
    });

    it("adds a course when all prerequisites are completed", async () => {
        const { eq, insert, from } = mockPrereqQuery();
        eq.mockResolvedValueOnce({
            data: [
                { course_code: "COMP-2412", status: "completed" },
                { course_code: "COMP-2477", status: "completed" }
            ],
            error: null
        });
        redirect.mockClear();

        await createCourse({}, inProgressFormData());

        expect(insert).toHaveBeenCalledWith({
            user_id: "user-1234",
            course_name: "Software Engineering",
            course_code: "COMP-3415",
            credits: 1,
            status: "in_progress"
        });

        expect(from).toHaveBeenCalledWith("student_courses");
        expect(redirect).toHaveBeenCalledWith("/courses");
    });

    it("returns an error when the prerequisite check fails", async () => {
        const { eq, insert } = mockPrereqQuery();
        eq.mockResolvedValueOnce({
            data: null,
            error: { message: "db down" }
        });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await createCourse({}, inProgressFormData());
        consoleError.mockRestore();

        expect(result).toEqual({
            error: "Could not check prerequisites."
        });
        expect(insert).not.toHaveBeenCalled();
    });

    it("skips the prerequisite check for a completed course", async () => {
        const { eq, insert } = mockPrereqQuery();

        await createCourse({}, inProgressFormData("completed"));

        expect(insert).toHaveBeenCalledWith({
            user_id: "user-1234",
            course_name: "Software Engineering",
            course_code: "COMP-3415",
            credits: 1,
            status: "completed"
        });
        expect(eq).not.toHaveBeenCalled();
    });
});

describe("updateCourse", () => {
    const validFormData = () => {
        const formData = new FormData();
        formData.set("id", "course-123");
        formData.set("course_name", "Software Engineering");
        formData.set("course_code", "COMP-3415");
        formData.set("credits", "3");
        formData.set("status", "in_progress");
        return formData;
    };

    const mockLoggedInUser = () => {
        const getUser = vi.fn().mockResolvedValue({
            data: {
                user: { id: "user-1234" }
            }
        });

        createClient.mockResolvedValue({
            auth: { getUser }
        });

        return getUser;
    };

    it("returns an error when the user is not signed in", async () => {
        const getUser = vi.fn().mockResolvedValue({
            data: { user: null }
        });

        createClient.mockResolvedValue({
            auth: { getUser }
        });

        const result = await updateCourse({}, validFormData());

        expect(result).toEqual({
            error: "You must be signed in to update a course."
        });
    });

    it("returns an error if course ID does not exist", async () => {
        mockLoggedInUser();

        const maybeSingle = vi.fn().mockResolvedValue({
            data: null,
            error: null
        });

        const select = vi.fn().mockReturnValue({ maybeSingle });
        const secondEq = vi.fn().mockReturnValue({ select });
        const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
        const update = vi.fn().mockReturnValue({ eq: firstEq });

        const from = vi.fn().mockReturnValue({ update });

        createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user-1234" } }
                })
            },
            from
        });

        const result = await updateCourse({}, validFormData());

        expect(result).toEqual({
            error: "Course not found or you do not have permission to update it."
        });

        expect(firstEq).toHaveBeenCalledWith("id", "course-123");
        expect(secondEq).toHaveBeenCalledWith("user_id", "user-1234");
    });

    it("course is updated when valid course ID exists and information is valid", async () => {
        mockLoggedInUser();

        const maybeSingle = vi.fn().mockResolvedValue({
            data: { id: "course-123" },
            error: null
        });

        const select = vi.fn().mockReturnValue({ maybeSingle });
        const secondEq = vi.fn().mockReturnValue({ select });
        const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
        const update = vi.fn().mockReturnValue({ eq: firstEq });
        const from = vi.fn().mockReturnValue({ update });

        createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user-1234" } }
                })
            },
            from
        });

        const result = await updateCourse({}, validFormData());

        expect(from).toHaveBeenCalledWith("student_courses");

        expect(update).toHaveBeenCalledWith({
            course_name: "Software Engineering",
            course_code: "COMP-3415",
            credits: 3,
            status: "in_progress"
        });

        expect(firstEq).toHaveBeenCalledWith("id", "course-123");
        expect(secondEq).toHaveBeenCalledWith("user_id", "user-1234");
        expect(select).toHaveBeenCalledWith("id");
        expect(redirect).toHaveBeenCalledWith("/courses");
        expect(result).toBeUndefined();
    });

    it("returns an error when course ID is empty", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("id", "");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "A valid course ID is required."
        });
    });

    it("returns an error when course name is empty", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("course_name", "");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "Course name can not be empty and must contain at least one letter."
        });
    });

    it("returns an error when course name does not contain at least one letter", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("course_name", "123456");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "Course name can not be empty and must contain at least one letter."
        });
    });

    it("returns an error when course code is empty", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("course_code", "");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "Course code must be in the format ABCD-#### and is required."
        });
    });

    it("returns an error when course code does not fit the AAAA-#### regex", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("course_code", "COMP-123");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "Course code must be in the format ABCD-#### and is required."
        });
    });

    it("returns an error when credits are empty", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("credits", "");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "Number of credits is required."
        });
    });

    it("returns an error when credit number is invalid", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("credits", "-1");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "Number of credits must be a positive number."
        });
    });

    it("returns an error when credits are not a number", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("credits", "abc");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "Number of credits must be a positive number."
        });
    });

    it("returns an error when course status is invalid", async () => {
        mockLoggedInUser();

        const formData = validFormData();
        formData.set("status", "not_a_status");

        const result = await updateCourse({}, formData);

        expect(result).toEqual({
            error: "Please select a valid course status."
        });
    });

    it("returns an error when the database update fails", async () => {
        mockLoggedInUser();

        const maybeSingle = vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Error in database" }
        });

        const select = vi.fn().mockReturnValue({ maybeSingle });
        const secondEq = vi.fn().mockReturnValue({ select });
        const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
        const update = vi.fn().mockReturnValue({ eq: firstEq });
        const from = vi.fn().mockReturnValue({ update });

        createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user-1234" } }
                })
            },
            from
        });

        const result = await updateCourse({}, validFormData());

        expect(result).toEqual({
            error: "Unable to update course. Please try again."
        });
    });
});

describe("deleteCourse", () => {
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

        const result = await deleteCourse("fake-course");

        expect(result).toEqual({
            error: "You must be signed in to delete a course."
        });
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

    it("error is returned when course ID is empty", async () => {
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

        const result = await deleteCourse("");

        expect(result).toEqual({
            error: "A course ID is required."
        });
    });

    it("error is returned when course id is not found or permission is not granted", async () => {
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

        const result = await deleteCourse("fake-course");

        expect(result).toEqual({
            error: "Course not found or you do not have permission to delete it."
        });
    });

    
    it("error is returned when database delete failed", async () => {
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

        const result = await deleteCourse("fake-course");

        expect(result).toEqual({
            error: "Unable to delete course. Please try again."
        });
    });
});