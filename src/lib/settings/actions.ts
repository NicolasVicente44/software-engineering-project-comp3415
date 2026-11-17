"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parsePlanningSettings, parseProfileDetails } from "@/lib/settings/validation";

export type SettingsState = {
    error?: string;
    message?: string;
};

// save part of the student's settings row, creating the row if needed (us-06, us-11)
async function saveSettings(
    values: Record<string, unknown>,
    what: string
): Promise<SettingsState> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: `You must be signed in to change your ${what}.` };
    }

    const { error } = await supabase
        .from("student_settings")
        .upsert({
            user_id: user.id,
            ...values,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error(`Failed to save ${what}:`, error);

        return { error: `Unable to save your ${what}. Please try again.` };
    }

    // the plan and dashboard read these settings
    revalidatePath("/profile");
    revalidatePath("/plan");
    revalidatePath("/dashboard");

    return { message: `Your ${what} ${what.endsWith("s") ? "were" : "was"} saved.` };
}

// save the student's name, school and program (us-11)
export async function saveProfileDetails(_previousState: SettingsState, formData: FormData): Promise<SettingsState> {
    const parsed = parseProfileDetails(formData);

    if (!parsed.ok) {
        return { error: parsed.error };
    }

    return saveSettings(parsed.value, "profile");
}

// save the student's credit limit per term (us-06) and credits to graduate (us-11)
export async function savePlanningSettings(_previousState: SettingsState, formData: FormData): Promise<SettingsState> {
    const parsed = parsePlanningSettings(formData);

    if (!parsed.ok) {
        return { error: parsed.error };
    }

    return saveSettings(parsed.value, "planning settings");
}
