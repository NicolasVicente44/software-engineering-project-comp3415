"use client";
import { useActionState, useState } from "react";
import type { AuthState } from "@/lib/auth/actions";

import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChangeEmailFormProps = {
    action: (previousState: AuthState, formData: FormData) => Promise<AuthState>;
    email: string;
};

// lets a student change their email; it only changes once confirmed (us-11)
export function ChangeEmailForm({ action, email }: ChangeEmailFormProps) {
    const initialState: AuthState = {};
    const [state, formAction, pending] = useActionState(action, initialState);
    const [newEmail, setNewEmail] = useState("");

    return (
        <form action={formAction} noValidate className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
                Current email: <strong className="text-foreground">{email}</strong>
            </p>
            <div className="flex flex-col gap-2">
                <Label htmlFor="email">New email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                />
            </div>

            <FormFeedback state={state} />

            <Button type="submit" variant="outline" disabled={pending} className="self-start">
                {pending ? "Sending..." : "Change Email"}
            </Button>
        </form>
    );
}
