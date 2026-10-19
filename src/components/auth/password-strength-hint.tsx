import { cn } from "@/lib/utils";
import type { PasswordStrength } from "@/lib/auth/validation";

const BAR_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-lime-500",
  "bg-green-600",
];

export function PasswordStrengthHint({
  strength,
}: {
  strength: PasswordStrength;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={cn(
              "h-1 flex-1 rounded-full bg-muted",
              bar <= strength.score && BAR_COLORS[strength.score],
            )}
          />
        ))}
      </div>
      <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {strength.label
          ? `Password strength: ${strength.label}`
          : "Use at least 8 characters. A mix of letters, numbers and symbols is stronger."}
      </p>
    </div>
  );
}
