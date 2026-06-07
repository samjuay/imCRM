import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type {
  CreateLeadStatusInput,
  LeadStatus,
  UpdateLeadStatusInput,
} from "@/types/lead-status";

export const leadStatusService = {
  async getByCompany(companyId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_statuses")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .order("display_order", { ascending: true });
  },

  async getById(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_statuses")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .maybeSingle();
  },

  async create(companyId: string, input: CreateLeadStatusInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_statuses")
      .insert({ ...input, company_id: scopedCompanyId })
      .select()
      .single();
  },

  async update(companyId: string, id: string, input: UpdateLeadStatusInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_statuses")
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
      .from("lead_statuses")
      .delete()
      .eq("company_id", scopedCompanyId)
      .eq("id", id);
  },
};

export type { LeadStatus };