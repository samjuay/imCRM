import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import { normalizeRelation } from "@/lib/database/supabase-relations";
import type {
  CreateLeadSiteVisitInput,
  LeadSiteVisit,
  LeadSiteVisitListItem,
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

  // Sprint 3A: company-wide list for dashboard (C/E + timeline completed/created).
  // Returns 3C fields (assigned_user_id/name, team_id, team_leader_id).
  async listByCompany(
    companyId: string,
    filters: {
      date_from?: string | undefined;
      date_to?: string | undefined;
      visit_status?: SiteVisitStatus | SiteVisitStatus[];
      assigned_user_id?: string | undefined;
      search?: string | undefined;
    } = {},
    page = 1,
    pageSize = 50,
    scopedAssigneeIds: string[] | null = null,
  ): Promise<{ data: LeadSiteVisitListItem[] | null; error: Error | null; total?: number }> {
    const scopedCompanyId = requireCompanyId(companyId);

    if (scopedAssigneeIds !== null && scopedAssigneeIds.length === 0) {
      return { data: [], error: null, total: 0 };
    }

    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("lead_site_visits")
      .select(
        `id, lead_id, company_id, visit_date, project_id, remarks, visit_status,
         created_by, created_at,
         projects(project_name),
         creator:users!lead_site_visits_created_by_fkey(full_name),
         leads( full_name, assigned_user_id, assigned_user:users!leads_assigned_user_id_fkey(full_name, team_id, team_leader_id) )`,
        { count: "exact" }
      )
      .eq("company_id", scopedCompanyId)
      .order("visit_date", { ascending: true })
      .range(from, to);

    if (filters.date_from) {
      query = query.gte("visit_date", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("visit_date", filters.date_to);
    }
    if (filters.visit_status) {
      if (Array.isArray(filters.visit_status)) {
        query = query.in("visit_status", filters.visit_status);
      } else {
        query = query.eq("visit_status", filters.visit_status);
      }
    }
    if (filters.assigned_user_id) {
      query = query.eq("leads.assigned_user_id", filters.assigned_user_id);
    } else if (scopedAssigneeIds !== null) {
      query = query.in("leads.assigned_user_id", scopedAssigneeIds);
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`leads.full_name.ilike.${term}`);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error as Error };
    }

    const rows = (data ?? []) as any[];
    const mapped: LeadSiteVisitListItem[] = rows.map((row) => {
      const lead = row.leads ? (Array.isArray(row.leads) ? row.leads[0] : row.leads) : null;
      const assigned = lead?.assigned_user ? (Array.isArray(lead.assigned_user) ? lead.assigned_user[0] : lead.assigned_user) : null;
      const proj = normalizeRelation(row.projects);
      return {
        id: row.id,
        lead_id: row.lead_id,
        company_id: row.company_id,
        visit_date: row.visit_date,
        project_id: row.project_id,
        remarks: row.remarks,
        visit_status: row.visit_status,
        created_by: row.created_by,
        created_at: row.created_at,
        project_name: proj?.project_name ?? null,
        created_by_name: normalizeRelation(row.creator)?.full_name,
        // 3C fields
        assigned_user_id: lead?.assigned_user_id ?? null,
        assigned_user_name: assigned?.full_name ?? null,
        team_id: assigned?.team_id ?? null,
        team_leader_id: assigned?.team_leader_id ?? null,
        lead_full_name: lead?.full_name ?? undefined,
      } as LeadSiteVisitListItem;
    });

    return {
      data: mapped,
      error: null,
      total: count ?? mapped.length,
    };
  },
};