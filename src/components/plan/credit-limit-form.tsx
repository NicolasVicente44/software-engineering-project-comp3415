"use client";
import { useActionState } from "react";
import type { CreditLimitState } from "@/lib/settings/actions";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreditLimitFormProps = {
    action: (previousState: CreditLimitState, formData: FormData) => Promise<CreditLimitState>;
    creditLimit: number;
};

// lets a student set the most credits they want in one term (us-06)
export function CreditLimitForm({ action, creditLimit }: CreditLimitFormProps) {
    const initialState: CreditLimitState = {};
    const [state, formAction, pending] = useActionState(action, initialState);

    return (
        <form action={formAction} noValidate className="flex flex-col gap-2">
            <Label htmlFor="credit_limit">Credit limit per term</Label>
            <div className="flex gap-2">
                <Input id="credit_limit" name="credit_limit" type="number" required min="0" step="0.01" defaultValue={creditLimit} className="w-28"/>
                <Button type="submit" variant="outline" disabled={pending}>
                    {pending ? "Saving..." : "Save Limit"}
                </Button>
            </div>

            {state.error && (
                <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}
        </form>
    );
}
