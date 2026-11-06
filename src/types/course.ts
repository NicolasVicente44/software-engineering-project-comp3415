export type Course = {
    id: string;
    user_id: string;
    course_name: string;
    course_code: string;
    credits: number;
    status: "completed" | "in_progress" | "dropped" | "failed";
    prerequisites?: string[];
    created_at: string;
};