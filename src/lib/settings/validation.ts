// highest credit limit a student can save, matching the database check (us-06)
export const MAX_CREDIT_LIMIT = 10;
// highest credits to graduate a student can save, matching the database check (us-11)
export const MAX_CREDITS_TO_GRADUATE = 100;
// longest name, school or program a student can save (us-11)
export const MAX_TEXT_LENGTH = 100;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type ProfileDetails = {
    full_name: string | null;
    school: string | null;
    program: string | null;
};

export type PlanningSettings = {
    credit_limit: number;
    credits_to_graduate: number | null;
};

const readText = (formData: FormData, field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
};

// name, school and program are optional; an empty field is saved as null (us-11)
export function parseProfileDetails(formData: FormData): Result<ProfileDetails> {
    const fields = [
        ["full_name", "Name"],
        ["school", "School"],
        ["program", "Program"],
    ] as const;

    for (const [field, label] of fields) {
        if (readText(formData, field).length > MAX_TEXT_LENGTH) {
            return { ok: false, error: `${label} must be at most ${MAX_TEXT_LENGTH} characters.` };
        }
    }

    return {
        ok: true,
        value: {
            full_name: readText(formData, "full_name") || null,
            school: readText(formData, "school") || null,
            program: readText(formData, "program") || null,
        },
    };
}

// credit limit is required (us-06); credits to graduate is optional (us-11)
export function parsePlanningSettings(formData: FormData): Result<PlanningSettings> {
    const creditLimit = readText(formData, "credit_limit");

    if (creditLimit === "") {
        return { ok: false, error: "Credit limit is required." };
    }

    const limit = Number(creditLimit);

    if (!Number.isFinite(limit) || limit <= 0 || limit > MAX_CREDIT_LIMIT) {
        return {
            ok: false,
            error: `Credit limit must be a number greater than 0 and at most ${MAX_CREDIT_LIMIT}.`,
        };
    }

    const creditsToGraduate = readText(formData, "credits_to_graduate");

    if (creditsToGraduate === "") {
        return { ok: true, value: { credit_limit: limit, credits_to_graduate: null } };
    }

    const toGraduate = Number(creditsToGraduate);

    if (!Number.isFinite(toGraduate) || toGraduate <= 0 || toGraduate > MAX_CREDITS_TO_GRADUATE) {
        return {
            ok: false,
            error: `Credits to graduate must be a number greater than 0 and at most ${MAX_CREDITS_TO_GRADUATE}.`,
        };
    }

    return { ok: true, value: { credit_limit: limit, credits_to_graduate: toGraduate } };
}
