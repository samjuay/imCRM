import type { UserRole } from "@/types/auth";

export type CreateCompanyUserInput = {
  full_name: string;
  email: string;
  mobile: string;
  role: Extract<UserRole, "team_leader" | "sales_executive">;
  team_id: string | null;
  status: string;
};