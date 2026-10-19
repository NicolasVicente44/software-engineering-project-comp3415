"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPasswordStrength } from "@/lib/auth/validation";
import { PasswordStrengthHint } from "./password-strength-hint";

export function NewPasswordFields({
  passwordLabel = "Password",
}: {
  passwordLabel?: string;
}) {
  const [password, setPassword] = useState("");

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrengthHint strength={getPasswordStrength(password)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
    </>
  );
}
