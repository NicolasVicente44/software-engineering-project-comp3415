"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updatePassword, type AuthState } from "@/lib/auth/actions";
import { FormFeedback } from "./form-feedback";
import { NewPasswordFields } from "./new-password-fields";

const initialState: AuthState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <NewPasswordFields passwordLabel="New password" />
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait..." : "Update password"}
      </Button>
    </form>
  );
}
