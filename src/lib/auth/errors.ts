type AuthErrorLike = { code?: string; name?: string; message?: string };

const ACCOUNT_EXISTS =
  "An account with this email already exists. Try signing in instead.";
const LINK_EXPIRED = "This link has expired. Please request a new one.";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed:
    "Please confirm your email before signing in. Check your inbox for the confirmation link.",
  user_already_exists: ACCOUNT_EXISTS,
  email_exists: ACCOUNT_EXISTS,
  weak_password:
    "That password is too weak. Use a longer one with a mix of letters, numbers and symbols.",
  same_password: "Your new password must be different from your old one.",
  over_request_rate_limit:
    "Too many attempts. Please wait a few minutes and try again.",
  over_email_send_rate_limit:
    "Too many emails requested. Please wait a few minutes and try again.",
  signup_disabled: "Sign ups are currently disabled.",
  otp_expired: LINK_EXPIRED,
  flow_state_expired: LINK_EXPIRED,
};

export const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";

export const ACCOUNT_EXISTS_ERROR = ACCOUNT_EXISTS;

export function friendlyAuthError(error: AuthErrorLike): string {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.name === "AuthRetryableFetchError") {
    return "Could not reach the server. Check your connection and try again.";
  }
  return GENERIC_AUTH_ERROR;
}
