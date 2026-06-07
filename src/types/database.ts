import type { UserRole } from "@/types/auth";

export type DbUser = {
  id: string;
  auth_user_id: string;
  company_id: string;
  team_id: string | null;
  role: UserRole;
  full_name: string;
  mobile: string | null;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DbUserSession = {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
};

export type DbUserInsert = Pick<DbUserSession, "user_id" | "login_at">;

export type DbUserSessionUpdate = Pick<DbUserSession, "logout_at">;