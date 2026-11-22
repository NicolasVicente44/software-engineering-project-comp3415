"use client";
import { useActionState, useState } from "react";
import type { SettingsState } from "@/lib/settings/actions";

import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileDetailsFormProps = {
    action: (previousState: SettingsState, formData: FormData) => Promise<SettingsState>;
    fullName: string;
    school: string;
    program: string;
};

// lets a student set their name, school and program (us-11)
export function ProfileDetailsForm({ action, fullName, school, program }: ProfileDetailsFormProps) {
    const initialState: SettingsState = {};
    const [state, formAction, pending] = useActionState(action, initialState);
    // controlled so the entered values stay when saving returns an error
    const [values, setValues] = useState({ full_name: fullName, school, program });

    const field = (name: keyof typeof values, label: string, placeholder: string, autoComplete?: string) => (
        <div className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
                id={name}
                name={name}
                type="text"
                maxLength={100}
                placeholder={placeholder}
                autoComplete={autoComplete}
                value={values[name]}
                onChange={(e) => setValues({ ...values, [name]: e.target.value })}
            />
        </div>
    );

    return (
        <form action={formAction} noValidate className="flex flex-col gap-4">
            {field("full_name", "Name", "Jane Doe", "name")}
            {field("school", "School", "Lakehead University", "organization")}
            {field("program", "Program", "Computer Science")}

            <FormFeedback state={state} />

            <Button type="submit" disabled={pending} className="self-start">
                {pending ? "Saving..." : "Save Profile"}
            </Button>
        </form>
    );
}
