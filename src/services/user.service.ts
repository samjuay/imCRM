import { createClient } from "@/lib/supabase/client";
import { normalizeRelation } from "@/lib/database/supabase-relations";
import type { UserProfile } from "@/types/auth";
import type { CompanyUser } from "@/types/lead";
import type { DbUser } from "@/types/database";

type RawCompanyUserRow = {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  role: string;
  team_id: string | null;
  team_leader_id: string | null;
  status: string;
  team_leader: { full_name: string } | { full_name: string }[] | null;
};

type BaseUserRow = Omit<RawCompanyUserRow, "team_leader">;

function mapDbUserToProfile(row: DbUser): UserProfile {
  return {
    user_id: row.id,
    auth_user_id: row.auth_user_id,
    company_id: row.company_id,
    team_id: row.team_id,
    team_leader_id: row.team_leader_id,
    role: row.role,
    full_name: row.full_name,
    email: row.email,
    status: row.status,
  };
}

function mapCompanyUser(row: RawCompanyUserRow): CompanyUser {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    team_id: row.team_id,
    team_leader_id: row.team_leader_id,
    team_leader_name: normalizeRelation(row.team_leader)?.full_name ?? null,
    status: row.status,
  };
}

export const userService = {
  async getByCompany(companyId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        `id, full_name, email, mobile, role, team_id, team_leader_id, status`,
      )
      .eq("company_id", companyId)
      .neq("status", "disabled")
      .order("full_name", { ascending: true });

    if (error) {
      return { data: null, error };
    }

    // Client-side enrichment to avoid self-referential DB relationship query
    // which triggers "Could not find a relationship between 'users' and 'users'" schema error.
    const baseRows = (data ?? []) as BaseUserRow[];
    const enriched = baseRows.map((row) => ({
      ...row,
      team_leader: row.team_leader_id
        ? { full_name: baseRows.find((u) => u.id === row.team_leader_id)?.full_name ?? null }
        : null,
    })) as RawCompanyUserRow[];

    return {
      data: enriched.map(mapCompanyUser),
      error: null,
    };
  },

  async fetchProfileByAuthUserId(authUserId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("users")
      .select(
        "id, auth_user_id, company_id, team_id, team_leader_id, role, full_name, email, status",
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