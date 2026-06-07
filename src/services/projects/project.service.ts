import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/types/project";

export const projectService = {
  async getByCompany(companyId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("projects")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .order("created_at", { ascending: false });
  },

  async getById(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("projects")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .maybeSingle();
  },

  async create(companyId: string, input: CreateProjectInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("projects")
      .insert({ ...input, company_id: scopedCompanyId })
      .select()
      .single();
  },

  async update(companyId: string, id: string, input: UpdateProjectInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("projects")
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
      .from("projects")
      .delete()
      .eq("company_id", scopedCompanyId)
      .eq("id", id);
  },
};

export type { Project };