const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export type Credentials = { email: string; password: string };

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function validateEmail(email: string): string | null {
  return EMAIL_PATTERN.test(email) ? null : "Enter a valid email address.";
}

function validatePassword(password: string): string | null {
  return password.length >= MIN_PASSWORD_LENGTH
    ? null
    : `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
}

function readEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim();
}

function readPassword(formData: FormData) {
  return String(formData.get("password") ?? "");
}

export function parseCredentials(formData: FormData): Result<Credentials> {
  const email = readEmail(formData);
  const password = readPassword(formData);

  const error = validateEmail(email) ?? validatePassword(password);
  if (error) return { ok: false, error };
  return { ok: true, value: { email, password } };
}

export function parseEmail(formData: FormData): Result<{ email: string }> {
  const email = readEmail(formData);
  const error = validateEmail(email);
  if (error) return { ok: false, error };
  return { ok: true, value: { email } };
}

export function parseNewPassword(
  formData: FormData,
): Result<{ password: string }> {
  const password = readPassword(formData);
  const confirm = String(formData.get("confirmPassword") ?? "");

  const error =
    validatePassword(password) ??
    (password === confirm ? null : "Passwords do not match.");
  if (error) return { ok: false, error };
  return { ok: true, value: { password } };
}

export function parseSignUp(formData: FormData): Result<Credentials> {
  const email = readEmail(formData);
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, error: emailError };

  const password = parseNewPassword(formData);
  if (!password.ok) return password;
  return { ok: true, value: { email, password: password.value.password } };
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "" | "Too short" | "Weak" | "Fair" | "Good" | "Strong";
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0, label: "" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { score: 0, label: "Too short" };
  }

  const points = [
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (points >= 4) return { score: 4, label: "Strong" };
  if (points === 3) return { score: 3, label: "Good" };
  if (points === 2) return { score: 2, label: "Fair" };
  return { score: 1, label: "Weak" };
}
