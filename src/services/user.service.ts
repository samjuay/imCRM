import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/auth";
import type { DbUser } from "@/types/database";

function mapDbUserToProfile(row: DbUser): UserProfile {
  return {
    user_id: row.id,
    auth_user_id: row.auth_user_id,
    company_id: row.company_id,
    team_id: row.team_id,
    role: row.role,
    full_name: row.full_name,
    email: row.email,
    status: row.status,
  };
}

export const userService = {
  async getByCompany(companyId: string) {
    const supabase = createClient();
    return supabase
      .from("users")
      .select("id, full_name, email, mobile, role, team_id, status")
      .eq("company_id", companyId)
      .neq("status", "disabled")
      .order("full_name", { ascending: true });
  },

  async fetchProfileByAuthUserId(authUserId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, auth_user_id, company_id, team_id, role, full_name, email, status",
      )
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      return { profile: null, error };
    }

    if (!data) {
      return { profile: null, error: null };
    }

    return {
      profile: mapDbUserToProfile(data as DbUser),
      error: null,
    };
  },
};