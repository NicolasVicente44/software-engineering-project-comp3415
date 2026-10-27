import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AuthState } from "@/lib/auth/actions";

export function FormFeedback({ state }: { state: AuthState }) {
  return (
    <>
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.message && (
        <Alert role="status">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
