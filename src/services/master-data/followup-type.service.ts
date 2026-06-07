import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type {
  CreateFollowupTypeInput,
  FollowupType,
  UpdateFollowupTypeInput,
} from "@/types/followup";

export const followupTypeService = {
  async getByCompany(companyId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("followup_types")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .order("type_name", { ascending: true });
  },

  async getById(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("followup_types")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .maybeSingle();
  },

  async create(companyId: string, input: CreateFollowupTypeInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("followup_types")
      .insert({ ...input, company_id: scopedCompanyId })
      .select()
      .single();
  },

  async update(companyId: string, id: string, input: UpdateFollowupTypeInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("followup_types")
      .update(input)
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .select()
      .single();
  },

  async delete(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("followup_types")
      .delete()
      .eq("company_id", scopedCompanyId)
      .eq("id", id);
  },
};

export type { FollowupType };