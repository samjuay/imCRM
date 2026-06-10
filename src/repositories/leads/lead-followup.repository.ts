import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import { normalizeRelation } from "@/lib/database/supabase-relations";
import type {
  CreateLeadFollowupInput,
  FollowupOutcome,
  FollowupStatus,
  LeadFollowup,
  LeadFollowupListItem,
  UpdateLeadFollowupInput,
} from "@/types/lead";

type RawFollowupRow = {
  id: string;
  lead_id: string;
  company_id: string;
  followup_type_id: string;
  followup_date: string;
  remarks: string | null;
  status: FollowupStatus;
  outcome: FollowupOutcome | null;
  created_by: string;
  created_at: string;
  followup_types: { type_name: string } | { type_name: string }[] | null;
  creator: { full_name: string } | { full_name: string }[] | null;
};

export const leadFollowupRepository = {
  async listByLead(companyId: string, leadId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lead_followups")
      .select(
        `id, lead_id, company_id, followup_type_id, followup_date, remarks, status, outcome,
         created_by, created_at,
         followup_types(type_name),
         creator:users!lead_followups_created_by_fkey(full_name)`,
      )
      .eq("company_id", scopedCompanyId)
      .eq("lead_id", leadId)
      .order("followup_date", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const rows = (data ?? []) as unknown as RawFollowupRow[];
    return {
      data: rows.map((row): LeadFollowup => ({
        id: row.id,
        lead_id: row.lead_id,
        company_id: row.company_id,
        followup_type_id: row.followup_type_id,
        followup_date: row.followup_date,
        remarks: row.remarks,
        status: row.status,
        outcome: row.outcome,
        created_by: row.created_by,
        created_at: row.created_at,
        followup_type_name: normalizeRelation(row.followup_types)?.type_name,
        created_by_name: normalizeRelation(row.creator)?.full_name,
      })),
      error: null,
    };
  },

  async create(companyId: string, input: CreateLeadFollowupInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_followups")
      .insert({
        ...input,
        company_id: scopedCompanyId,
        status: input.status ?? "pending",
        outcome: "pending",
      })
      .select("id")
      .single();
  },

  async update(
    companyId: string,
    id: string,
    input: UpdateLeadFollowupInput,
  ) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_followups")
      .update(input)
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .select("id")
      .single();
  },

  // Sprint 3A: company-wide list for dashboard (A/B/D). Server date/status filters.
  // Returns 3C fields (assigned_user_id/name, team_id, team_leader_id) for Sprint 3C.
  // assigned/search may be post-filtered in small result sets for V1.
  async listByCompany(
    companyId: string,
    filters: {
      date_from?: string | undefined;
      date_to?: string | undefined;
      status?: FollowupStatus;
      assigned_user_id?: string | undefined;
      search?: string | undefined;
    } = {},
    page = 1,
    pageSize = 50,
    scopedAssigneeIds: string[] | null = null,
  ): Promise<{ data: LeadFollowupListItem[] | null; error: Error | null; total?: number }> {
    const scopedCompanyId = requireCompanyId(companyId);

    if (scopedAssigneeIds !== null && scopedAssigneeIds.length === 0) {
      return { data: [], error: null, total: 0 };
    }

    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("lead_followups")
      .select(
        `id, lead_id, company_id, followup_type_id, followup_date, remarks, status, outcome,
         created_by, created_at,
         followup_types(type_name),
         creator:users!lead_followups_created_by_fkey(full_name),
         leads( full_name, assigned_user_id, assigned_user:users!leads_assigned_user_id_fkey(full_name, team_id, team_leader_id) )`,
        { count: "exact" }
      )
      .eq("company_id", scopedCompanyId)
      .order("followup_date", { ascending: true }) // good default for due/upcoming views
      .range(from, to);

    if (filters.date_from) {
      query = query.gte("followup_date", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("followup_date", filters.date_to);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.assigned_user_id) {
      // Server filter via embedded lead (works with the relation in select)
      query = query.eq("leads.assigned_user_id", filters.assigned_user_id);
    } else if (scopedAssigneeIds !== null) {
      query = query.in("leads.assigned_user_id", scopedAssigneeIds);
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      // Basic lead name search via or (embedded)
      query = query.or(`leads.full_name.ilike.${term}`);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error as Error };
    }

    const rows = (data ?? []) as any[];
    const mapped: LeadFollowupListItem[] = rows.map((row) => {
      const lead = row.leads ? (Array.isArray(row.leads) ? row.leads[0] : row.leads) : null;
      const assigned = lead?.assigned_user ? (Array.isArray(lead.assigned_user) ? lead.assigned_user[0] : lead.assigned_user) : null;
      return {
        id: row.id,
        lead_id: row.lead_id,
        company_id: row.company_id,
        followup_type_id: row.followup_type_id,
        followup_date: row.followup_date,
        remarks: row.remarks,
        status: row.status,
        outcome: row.outcome,
        created_by: row.created_by,
        created_at: row.created_at,
        followup_type_name: normalizeRelation(row.followup_types)?.type_name,
        created_by_name: normalizeRelation(row.creator)?.full_name,
        // 3C fields (required for Sprint 3C)
        assigned_user_id: lead?.assigned_user_id ?? null,
        assigned_user_name: assigned?.full_name ?? null,
        team_id: assigned?.team_id ?? null,
        team_leader_id: assigned?.team_leader_id ?? null,
        lead_full_name: lead?.full_name ?? undefined,
      } as LeadFollowupListItem;
    });

    return {
      data: mapped,
      error: null,
      total: count ?? mapped.length,
    };
  },
};