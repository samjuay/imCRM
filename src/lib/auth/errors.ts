import { AUTH_ERROR_MESSAGES } from "@/lib/auth/constants";
import type { AuthErrorCode } from "@/types/auth";

export function mapSupabaseAuthError(message: string): AuthErrorCode {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "invalid_credentials";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("failed to fetch")
  ) {
    return "network";
  }

  return "unknown";
}

export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.unknown;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: string }).message);
  }

  return "";
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return message.includes("network") || message.includes("fetch");
}