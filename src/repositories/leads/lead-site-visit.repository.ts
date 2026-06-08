import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import { normalizeRelation } from "@/lib/database/supabase-relations";
import type {
  CreateLeadSiteVisitInput,
  LeadSiteVisit,
  SiteVisitStatus,
  UpdateLeadSiteVisitInput,
} from "@/types/lead";

type RawSiteVisitRow = {
  id: string;
  lead_id: string;
  company_id: string;
  visit_date: string;
  project_id: string | null;
  remarks: string | null;
  visit_status: SiteVisitStatus;
  created_by: string;
  created_at: string;
  projects: { project_name: string } | { project_name: string }[] | null;
  creator: { full_name: string } | { full_name: string }[] | null;
};

export const leadSiteVisitRepository = {
  async listByLead(companyId: string, leadId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lead_site_visits")
      .select(
        `id, lead_id, company_id, visit_date, project_id, remarks, visit_status,
         created_by, created_at,
         projects(project_name),
         creator:users!lead_site_visits_created_by_fkey(full_name)`,
      )
      .eq("company_id", scopedCompanyId)
      .eq("lead_id", leadId)
      .order("visit_date", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const rows = (data ?? []) as unknown as RawSiteVisitRow[];
    return {
      data: rows.map((row): LeadSiteVisit => ({
        id: row.id,
        lead_id: row.lead_id,
        company_id: row.company_id,
        visit_date: row.visit_date,
        project_id: row.project_id,
        remarks: row.remarks,
        visit_status: row.visit_status,
        created_by: row.created_by,
        created_at: row.created_at,
        project_name: normalizeRelation(row.projects)?.project_name ?? null,
        created_by_name: normalizeRelation(row.creator)?.full_name,
      })),
      error: null,
    };
  },

  async create(companyId: string, input: CreateLeadSiteVisitInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_site_visits")
      .insert({
        ...input,
        company_id: scopedCompanyId,
        visit_status: input.visit_status ?? "planned",
      })
      .select("id")
      .single();
  },

  async update(
    companyId: string,
    id: string,
    input: UpdateLeadSiteVisitInput,
  ) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_site_visits")
      .update(input)
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .select("id")
      .single();
  },
};