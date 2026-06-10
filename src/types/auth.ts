export const USER_ROLES = [
  "super_admin",
  "company_admin",
  "team_leader",
  "sales_executive",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UserProfile = {
  user_id: string;
  auth_user_id: string;
  company_id: string;
  team_id: string | null;
  team_leader_id: string | null;
  role: UserRole;
  full_name: string;
  email: string;
  status: string;
};

export type AuthErrorCode =
  | "invalid_credentials"
  | "missing_profile"
  | "disabled"
  | "network"
  | "unknown";

export type SignInResult =
  | { success: true; redirectTo: string }
  | { success: false; code: AuthErrorCode; message: string };