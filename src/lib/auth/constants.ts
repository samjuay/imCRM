export const PUBLIC_ROUTES = ["/login", "/forgot-password"] as const;

export const UNAUTHORIZED_ROUTE = "/unauthorized";

export const DISABLED_STATUS = "disabled";

export const AUTH_ERROR_PARAM = "error";

export const AUTH_ERROR_MESSAGES = {
  disabled: "Account disabled. Contact administrator.",
  missing_profile: "User profile not configured. Contact administrator.",
  invalid_credentials: "Invalid email or password.",
  network: "Network error. Please try again.",
  unknown: "Something went wrong. Please try again.",
  session_expired: "Your session has expired. Please sign in again.",
} as const;