import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type {
  CreateLeadSourceInput,
  LeadSource,
  UpdateLeadSourceInput,
} from "@/types/lead-source";

function normalizeSourceName(name: string): string {
  return name.trim().toLowerCase();
}

export const leadSourceService = {
  async getByCompany(companyId: string, includeArchived = false) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    let query = supabase
      .from("lead_sources")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .order("source_name", { ascending: true });

    if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    return query.order("source_name", { ascending: true });
  },

  async getAllByCompany(companyId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_sources")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .order("source_name", { ascending: true });
  },

  async getById(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_sources")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .maybeSingle();
  },

  async getUsageCount(companyId: string, sourceId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    const { count, error } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("company_id", scopedCompanyId)
      .eq("lead_source_id", sourceId);

    if (error) return 0;
    return count ?? 0;
  },

  async create(companyId: string, input: CreateLeadSourceInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();

    // Validate and check for duplicates
    const normalizedName = normalizeSourceName(input.source_name);
    if (!normalizedName) {
      return { data: null, error: new Error("Source name is required") };
    }

    // Check for duplicate (case-insensitive, trimmed)
    const { data: existing } = await supabase
      .from("lead_sources")
      .select("id")
      .eq("company_id", scopedCompanyId)
      .is("archived_at", null)
      .ilike("source_name", input.source_name.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      return { data: null, error: new Error("A source with this name already exists") };
    }

    return supabase
      .from("lead_sources")
      .insert({ ...input, company_id: scopedCompanyId, source_name: input.source_name.trim() })
      .select()
      .single();
  },

  async update(companyId: string, id: string, input: UpdateLeadSourceInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();

    // If source_name is being updated, validate it
    if (input.source_name !== undefined) {
      const trimmedName = input.source_name.trim();
      if (!trimmedName) {
        return { data: null, error: new Error("Source name is required") };
      }

      // Check for duplicate (case-insensitive, trimmed) excluding current record
      const { data: existing } = await supabase
        .from("lead_sources")
        .select("id")
        .eq("company_id", scopedCompanyId)
        .is("archived_at", null)
        .neq("id", id)
        .ilike("source_name", trimmedName)
        .limit(1);

      if (existing && existing.length > 0) {
        return { data: null, error: new Error("A source with this name already exists") };
      }

      input.source_name = trimmedName;
    }

    return supabase
      .from("lead_sources")
      .update(input)
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .select()
      .single();
  },

  // Archive a source (soft delete)
  async archive(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_sources")
      .update({ archived_at: new Date().toISOString() })
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .select()
      .single();
  },

  // Restore an archived source
  async restore(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_sources")
      .update({ archived_at: null })
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .select()
      .single();
  },

};

export type { LeadSource };