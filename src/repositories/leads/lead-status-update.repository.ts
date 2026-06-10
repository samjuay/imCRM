import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import { normalizeRelation } from "@/lib/database/supabase-relations";
import type {
  CreateLeadStatusUpdateInput,
  LeadStatusUpdate,
  LeadStatusUpdateListItem,
} from "@/types/lead";

type RawStatusUpdateRow = {
  id: string;
  lead_id: string;
  company_id: string;
  previous_status: string | null;
  new_status: string;
  outcome: string | null;
  remark: string | null;
  next_followup_date: string | null;
  project_id: string | null;
  visit_date: string | null;
  created_by: string;
  created_at: string;
  creator: { full_name: string } | { full_name: string }[] | null;
  projects: { project_name: string } | { project_name: string }[] | null;
  // Sprint 3B assignment audit columns (additive)
  previous_assigned_user_id: string | null;
  new_assigned_user_id: string | null;
  assigned_by_user_id: string | null;
  assignment_reason: string | null;
  previous_assigned: { full_name: string } | { full_name: string }[] | null;
  new_assigned: { full_name: string } | { full_name: string }[] | null;
  assigner: { full_name: string } | { full_name: string }[] | null;
};

export const leadStatusUpdateRepository = {
  async listByLead(companyId: string, leadId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lead_status_updates")
      .select(
        `id, lead_id, company_id, previous_status, new_status, outcome, remark,
         next_followup_date, project_id, visit_date, created_by, created_at,
         creator:users!lead_status_updates_created_by_fkey(full_name),
         projects:projects(project_name),
         previous_assigned_user_id, new_assigned_user_id, assigned_by_user_id, assignment_reason,
         previous_assigned:users!lead_status_updates_previous_assigned_user_id_fkey(full_name),
         new_assigned:users!lead_status_updates_new_assigned_user_id_fkey(full_name),
         assigner:users!lead_status_updates_assigned_by_user_id_fkey(full_name)`
      )
      .eq("company_id", scopedCompanyId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const rows = (data ?? []) as unknown as RawStatusUpdateRow[];
    return {
      data: rows.map((row): LeadStatusUpdate => ({
        id: row.id,
        lead_id: row.lead_id,
        company_id: row.company_id,
        previous_status: row.previous_status,
        new_status: row.new_status,
        outcome: row.outcome,
        remark: row.remark,
        next_followup_date: row.next_followup_date,
        project_id: row.project_id,
        project_name: normalizeRelation(row.projects)?.project_name ?? null,
        visit_date: row.visit_date,
        created_by: row.created_by,
        created_at: row.created_at,
        created_by_name: normalizeRelation(row.creator)?.full_name,
        // Sprint 3B fields
        previous_assigned_user_id: row.previous_assigned_user_id,
        new_assigned_user_id: row.new_assigned_user_id,
        assigned_by_user_id: row.assigned_by_user_id,
        assignment_reason: row.assignment_reason,
        previous_assigned_user_name: normalizeRelation(row.previous_assigned)?.full_name ?? null,
        new_assigned_user_name: normalizeRelation(row.new_assigned)?.full_name ?? null,
        assigned_by_user_name: normalizeRelation(row.assigner)?.full_name ?? null,
      })),
      error: null,
    };
  },

  async create(companyId: string, input: CreateLeadStatusUpdateInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_status_updates")
      .insert({
        ...input,
        company_id: scopedCompanyId,
      })
      .select("id")
      .single();
  },

  // Sprint 3A: company-wide for timeline (status_changed + booking_completed detection).
  // Returns 3C fields.
  async listByCompany(
    companyId: string,
    filters: {
      date_from?: string | undefined;
      date_to?: string | undefined;
      assigned_user_id?: string | undefined;
      search?: string | undefined;
    } = {},
    page = 1,
    pageSize = 100,
    scopedAssigneeIds: string[] | null = null,
  ): Promise<{ data: LeadStatusUpdateListItem[] | null; error: Error | null; total?: number }> {
    const scopedCompanyId = requireCompanyId(companyId);

    if (scopedAssigneeIds !== null && scopedAssigneeIds.length === 0) {
      return { data: [], error: null, total: 0 };
    }

    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("lead_status_updates")
      .select(
        `id, lead_id, company_id, previous_status, new_status, outcome, remark,
         next_followup_date, project_id, visit_date, created_by, created_at,
         creator:users!lead_status_updates_created_by_fkey(full_name),
         projects(project_name),
         leads( full_name, assigned_user_id, assigned_user:users!leads_assigned_user_id_fkey(full_name, team_id, team_leader_id) ),
         previous_assigned_user_id, new_assigned_user_id, assigned_by_user_id, assignment_reason,
         previous_assigned:users!lead_status_updates_previous_assigned_user_id_fkey(full_name),
         new_assigned:users!lead_status_updates_new_assigned_user_id_fkey(full_name),
         assigner:users!lead_status_updates_assigned_by_user_id_fkey(full_name)`,
        { count: "exact" }
      )
      .eq("company_id", scopedCompanyId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.date_from) {
      query = query.gte("created_at", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("created_at", filters.date_to);
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
    const mapped: LeadStatusUpdateListItem[] = rows.map((row) => {
      const lead = row.leads ? (Array.isArray(row.leads) ? row.leads[0] : row.leads) : null;
      const assigned = lead?.assigned_user ? (Array.isArray(lead.assigned_user) ? lead.assigned_user[0] : lead.assigned_user) : null;
      const proj = normalizeRelation(row.projects);
      return {
        id: row.id,
        lead_id: row.lead_id,
        company_id: row.company_id,
        previous_status: row.previous_status,
        new_status: row.new_status,
        outcome: row.outcome,
        remark: row.remark,
        next_followup_date: row.next_followup_date,
        project_id: row.project_id,
        visit_date: row.visit_date,
        created_by: row.created_by,
        created_at: row.created_at,
        project_name: proj?.project_name ?? null,
        created_by_name: normalizeRelation(row.creator)?.full_name,
        // 3C
        assigned_user_id: lead?.assigned_user_id ?? null,
        assigned_user_name: assigned?.full_name ?? null,
        team_id: assigned?.team_id ?? null,
        team_leader_id: assigned?.team_leader_id ?? null,
        lead_full_name: lead?.full_name ?? undefined,
        // Sprint 3B assignment fields
        previous_assigned_user_id: row.previous_assigned_user_id,
        new_assigned_user_id: row.new_assigned_user_id,
        assigned_by_user_id: row.assigned_by_user_id,
        assignment_reason: row.assignment_reason,
        previous_assigned_user_name: normalizeRelation(row.previous_assigned)?.full_name ?? null,
        new_assigned_user_name: normalizeRelation(row.new_assigned)?.full_name ?? null,
        assigned_by_user_name: normalizeRelation(row.assigner)?.full_name ?? null,
      } as LeadStatusUpdateListItem;
    });

    return {
      data: mapped,
      error: null,
      total: count ?? mapped.length,
    };
  },
};
