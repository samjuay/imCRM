import type { UserRole } from "@/types/auth";

export type CreateCompanyUserInput = {
  full_name: string;
  email: string;
  mobile: string;
  role: Extract<UserRole, "team_leader" | "sales_executive">;
  team_id: string | null;
  team_leader_id?: string | null;
  new_team_name?: string | null;
  status: string;
  password: string;
};