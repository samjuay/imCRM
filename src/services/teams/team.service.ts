import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type { CreateTeamInput, Team } from "@/types/team";

export const teamService = {
  async getByCompany(companyId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("teams")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("status", "active")
      .order("team_name", { ascending: true });
  },

  async create(companyId: string, input: CreateTeamInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("teams")
      .insert({ ...input, company_id: scopedCompanyId })
      .select()
      .single();
  },
};

export type { Team };