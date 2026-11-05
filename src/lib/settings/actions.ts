"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CreditLimitState = {
    error?: string;
};

// highest credit limit a student can save, matching the database check (us-06)
const MAX_CREDIT_LIMIT = 10;

// save the student's credit limit per term, then rebuild their plan (us-06)
export async function saveCreditLimit(_previousState: CreditLimitState, formData: FormData): Promise<CreditLimitState> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            error: "You must be signed in to change your credit limit."
        };
    }

    const creditLimit = formData.get("credit_limit");

    if (typeof creditLimit !== "string" || creditLimit.trim() === "") {
        return {
            error: "Credit limit is required."
        };
    }

    const limitAsNumber = Number(creditLimit);

    if (!Number.isFinite(limitAsNumber) || limitAsNumber <= 0 || limitAsNumber > MAX_CREDIT_LIMIT) {
        return {
            error: `Credit limit must be a number greater than 0 and at most ${MAX_CREDIT_LIMIT}.`
        };
    }

    const { error } = await supabase
        .from("student_settings")
        .upsert({
            user_id: user.id,
            credit_limit: limitAsNumber,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error("Failed to save credit limit:", error);

        return {
            error: "Unable to save your credit limit. Please try again."
        };
    }

    // the plan is recalculated with the new limit
    redirect("/plan?generate=1");
}
