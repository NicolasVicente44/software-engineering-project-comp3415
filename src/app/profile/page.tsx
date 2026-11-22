import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ChangeEmailForm } from "@/components/profile/change-email-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { PlanningSettingsForm } from "@/components/profile/planning-settings-form";
import { ProfileDetailsForm } from "@/components/profile/profile-details-form";
import { changeEmail, changePassword } from "@/lib/auth/actions";
import { DEFAULT_CREDIT_LIMIT } from "@/lib/planner/generate-plan";
import { savePlanningSettings, saveProfileDetails } from "@/lib/settings/actions";
import { createClient } from "@/lib/supabase/server";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

// the student's profile, planning settings and account settings (us-11)
export default async function ProfilePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: settings, error } = await supabase
        .from("student_settings")
        .select("full_name, school, program, credit_limit, credits_to_graduate")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Failed to load profile: ", error);
    }

    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-10">
                <div>
                    <h1 className="text-2xl font-semibold">Profile</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Your details, planning preferences and account settings.
                    </p>
                </div>

                {error ? (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Unable to load your profile. Please try again.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Your details</CardTitle>
                                <CardDescription>
                                    So your plan reflects your school and program.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ProfileDetailsForm
                                    action={saveProfileDetails}
                                    fullName={settings?.full_name ?? ""}
                                    school={settings?.school ?? ""}
                                    program={settings?.program ?? ""}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Planning</CardTitle>
                                <CardDescription>
                                    Used when your academic plan is generated.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PlanningSettingsForm
                                    action={savePlanningSettings}
                                    creditLimit={Number(settings?.credit_limit ?? DEFAULT_CREDIT_LIMIT)}
                                    creditsToGraduate={
                                        settings?.credits_to_graduate == null
                                            ? null
                                            : Number(settings.credits_to_graduate)
                                    }
                                />
                            </CardContent>
                        </Card>
                    </>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Email</CardTitle>
                        <CardDescription>
                            We send a confirmation link to the new address before it changes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChangeEmailForm action={changeEmail} email={user.email ?? ""} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Password</CardTitle>
                        <CardDescription>
                            Enter your current password to set a new one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChangePasswordForm action={changePassword} />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
