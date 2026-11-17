"use client";
import { useActionState } from "react";
import type { AuthState } from "@/lib/auth/actions";

import { FormFeedback } from "@/components/auth/form-feedback";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChangePasswordFormProps = {
    action: (previousState: AuthState, formData: FormData) => Promise<AuthState>;
};

// lets a signed-in student change their password (us-11)
export function ChangePasswordForm({ action }: ChangePasswordFormProps) {
    const initialState: AuthState = {};
    const [state, formAction, pending] = useActionState(action, initialState);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                />
            </div>
            {/* remounted after each result so the password fields are cleared */}
            <NewPasswordFields key={state.message ?? state.error ?? ""} passwordLabel="New password" />

            <FormFeedback state={state} />

            <Button type="submit" variant="outline" disabled={pending} className="self-start">
                {pending ? "Saving..." : "Change Password"}
            </Button>
        </form>
    );
}
