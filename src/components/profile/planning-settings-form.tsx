"use client";
import { useActionState, useState } from "react";
import type { SettingsState } from "@/lib/settings/actions";

import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlanningSettingsFormProps = {
    action: (previousState: SettingsState, formData: FormData) => Promise<SettingsState>;
    creditLimit: number;
    creditsToGraduate: number | null;
};

// lets a student set their credit limit per term (us-06) and credits to graduate (us-11)
export function PlanningSettingsForm({ action, creditLimit, creditsToGraduate }: PlanningSettingsFormProps) {
    const initialState: SettingsState = {};
    const [state, formAction, pending] = useActionState(action, initialState);
    // controlled so the entered values stay when saving returns an error
    const [values, setValues] = useState({
        credit_limit: String(creditLimit),
        credits_to_graduate: creditsToGraduate == null ? "" : String(creditsToGraduate),
    });

    return (
        <form action={formAction} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="credit_limit">Credit limit per term</Label>
                    <Input
                        id="credit_limit"
                        name="credit_limit"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={values.credit_limit}
                        onChange={(e) => setValues({ ...values, credit_limit: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                        The most credits your plan puts in one term.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="credits_to_graduate">Credits needed to graduate</Label>
                    <Input
                        id="credits_to_graduate"
                        name="credits_to_graduate"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="20"
                        value={values.credits_to_graduate}
                        onChange={(e) => setValues({ ...values, credits_to_graduate: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                        Optional. Used to show your progress on the dashboard.
                    </p>
                </div>
            </div>

            <FormFeedback state={state} />

            <Button type="submit" disabled={pending} className="self-start">
                {pending ? "Saving..." : "Save Planning Settings"}
            </Button>
        </form>
    );
}
