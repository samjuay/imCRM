import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type {
  CreateLeadInput,
  Lead,
  LeadActivityContext,
  LeadDetail,
  LeadDetailBundle,
  LeadFilters,
  LeadListItem,
  PaginatedResult,
  UpdateLeadInput,
} from "@/types/lead";

const LEAD_LIST_SELECT = `
  id, company_id, assigned_user_id, lead_source_id, full_name, phone, email,
  budget, location, requirement, status_id, remarks, created_by, created_at, updated_at,
  lead_sources!inner(source_name),
  lead_statuses!inner(status_name),
  assigned_user:users!leads_assigned_user_id_fkey(full_name)
`;

const LEAD_DETAIL_SELECT = `
  id, company_id, assigned_user_id, lead_source_id, full_name, phone, email,
  budget, location, requirement, status_id, remarks, created_by, created_at, updated_at,
  lead_sources!inner(source_name),
  lead_statuses!inner(status_name),
  assigned_user:users!leads_assigned_user_id_fkey(full_name),
  creator:users!leads_created_by_fkey(full_name)
`;

type LeadListRow = Lead & {
  lead_sources: { source_name: string };
  lead_statuses: { status_name: string };
  assigned_user: { full_name: string } | null;
};

type LeadDetailRow = LeadListRow & {
  creator: { full_name: string };
};

function mapListRow(row: LeadListRow): LeadListItem {
  return {
    id: row.id,
    company_id: row.company_id,
    assigned_user_id: row.assigned_user_id,
    lead_source_id: row.lead_source_id,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    budget: row.budget,
    location: row.location,
    requirement: row.requirement,
    status_id: row.status_id,
    remarks: row.remarks,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    source_name: row.lead_sources.source_name,
    status_name: row.lead_statuses.status_name,
    assigned_user_name: row.assigned_user?.full_name ?? null,
  };
}

function mapDetailRow(row: LeadDetailRow): LeadDetail {
  const list = mapListRow(row);
  return {
    ...list,
    created_by_name: row.creator.full_name,
  };
}

function getTodayISO(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

async function getLeadIdsWithNextActionDate(
  supabase: ReturnType<typeof createClient>,
  scopedCompanyId: string,
  scopedAssigneeIds: string[] | null,
): Promise<Set<string>> {
  const today = getTodayISO();
  const leadIds = new Set<string>();

  // 1. Pending followups with future/present followup_date
  const { data: followups } = await supabase
    .from("lead_followups")
    .select("lead_id")
    .eq("company_id", scopedCompanyId)
    .eq("status", "pending")
    .gte("followup_date", today);

  if (followups) {
    followups.forEach((r: any) => leadIds.add(r.lead_id));
  }

  // 2. Planned/rescheduled site visits with future/present visit_date
  const { data: siteVisits } = await supabase
    .from("lead_site_visits")
    .select("lead_id")
    .eq("company_id", scopedCompanyId)
    .in("visit_status", ["planned", "rescheduled"])
    .gte("visit_date", today);

  if (siteVisits) {
    siteVisits.forEach((r: any) => leadIds.add(r.lead_id));
  }

  // 3. Status updates with next_followup_date
  const { data: statusUpdatesNextFollowup } = await supabase
    .from("lead_status_updates")
    .select("lead_id")
    .eq("company_id", scopedCompanyId)
    .not("next_followup_date", "is", null)
    .gte("next_followup_date", today);

  if (statusUpdatesNextFollowup) {
    statusUpdatesNextFollowup.forEach((r: any) => leadIds.add(r.lead_id));
  }

  // 4. Status updates with visit_date
  const { data: statusUpdatesVisitDate } = await supabase
    .from("lead_status_updates")
    .select("lead_id")
    .eq("company_id", scopedCompanyId)
    .not("visit_date", "is", null)
    .gte("visit_date", today);

  if (statusUpdatesVisitDate) {
    statusUpdatesVisitDate.forEach((r: any) => leadIds.add(r.lead_id));
  }

  return leadIds;
}

export const leadRepository = {
  async getDetailBundle(id: string) {
    const startedAt = performance.now();
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_lead_detail_bundle", {
      p_lead_id: id,
    });
    const duration = performance.now() - startedAt;
    console.log(
      `[PERF] LEAD_DETAIL_RPC_${id}: ${duration.toFixed(2)}ms (${error ? "error" : "completed"})`,
    );

    return {
      data: data as LeadDetailBundle | null,
      error,
    };
  },

  async list(
    companyId: string,
    filters: LeadFilters,
    page: number,
    pageSize: number,
    scopedAssigneeIds: string[] | null = null,
  ): Promise<{ data: PaginatedResult<LeadListItem> | null; error: Error | null }> {
    console.log('[LEADS] REPO_QUERY_START', { companyId, page, pageSize, scopedAssigneeIds: scopedAssigneeIds?.length ?? null });
    const scopedCompanyId = requireCompanyId(companyId);

    if (scopedAssigneeIds !== null && scopedAssigneeIds.length === 0) {
      console.log('[LEADS] REPO_QUERY_COMPLETE - empty (no assignees)');
      return {
        data: {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 1,
        },
        error: null,
      };
    }

    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("leads")
      .select(LEAD_LIST_SELECT, { count: "exact" })
      .eq("company_id", scopedCompanyId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`full_name.ilike.${term},phone.ilike.${term}`);
    }
    if (filters.status_id) {
      query = query.eq("status_id", filters.status_id);
    }
    if (filters.lead_source_id) {
      query = query.eq("lead_source_id", filters.lead_source_id);
    }
    if (filters.assigned_user_id) {
      query = query.eq("assigned_user_id", filters.assigned_user_id);
    } else if (scopedAssigneeIds !== null) {
      query = query.in("assigned_user_id", scopedAssigneeIds);
    }

    console.log('[LEADS] REPO_QUERY_EXECUTING');
    const { data, error, count } = await query;
    console.log('[LEADS] REPO_QUERY_COMPLETE', { error: !!error, count: count ?? 0, rows: data?.length ?? 0 });

    if (error) {
      console.error('[LEADS] REPO_QUERY_ERROR', error);
      return { data: null, error };
    }

    const total = count ?? 0;
    const rows = (data ?? []) as unknown as LeadListRow[];

    console.log('[LEADS] REPO_MAPPING_COMPLETE', { mapped: rows.length });
    return {
      data: {
        data: rows.map(mapListRow),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
      error: null,
    };
  },

  async getById(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_DETAIL_SELECT)
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return { data: null, error };
    }

    return {
      data: mapDetailRow(data as unknown as LeadDetailRow),
      error: null,
    };
  },

  async phoneExists(companyId: string, phone: string, excludeId?: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    let query = supabase
      .from("leads")
      .select("id, full_name")
      .eq("company_id", scopedCompanyId)
      .eq("phone", phone);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    return { exists: !!data, lead: data, error };
  },

  async create(companyId: string, input: CreateLeadInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("leads")
      .insert({ ...input, company_id: scopedCompanyId })
      .select("id")
      .single();
  },

  async update(companyId: string, id: string, input: UpdateLeadInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("leads")
      .update(input)
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .select("id")
      .single();
  },

  async delete(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("leads")
      .delete()
      .eq("company_id", scopedCompanyId)
      .eq("id", id);
  },

  async countWithoutFollowup(
    companyId: string,
    _terminalStatusIds: string[],
    scopedAssigneeIds: string[] | null = null,
    statusId?: string,
    leadSourceId?: string,
  ): Promise<{ count: number; error: Error | null }> {
    const scopedCompanyId = requireCompanyId(companyId);

    if (scopedAssigneeIds !== null && scopedAssigneeIds.length === 0) {
      return { count: 0, error: null };
    }

    const supabase = createClient();

    const leadsWithNextAction = await getLeadIdsWithNextActionDate(
      supabase,
      scopedCompanyId,
      scopedAssigneeIds,
    );

    // Fetch ALL scoped lead IDs, then filter in memory
    // This matches the exact same logic as listWithoutFollowup
    let query = supabase
      .from("leads")
      .select("id")
      .eq("company_id", scopedCompanyId);

    if (scopedAssigneeIds !== null) {
      query = query.in("assigned_user_id", scopedAssigneeIds);
    }

    if (statusId) {
      query = query.eq("status_id", statusId);
    }

    if (leadSourceId) {
      query = query.eq("lead_source_id", leadSourceId);
    }

    const { data, error } = await query;

    if (error) {
      return { count: 0, error: error as Error };
    }

    const scopedLeadIds = (data ?? []).map((r: any) => r.id as string);
    const count = scopedLeadIds.filter((id: string) => !leadsWithNextAction.has(id)).length;

    return { count, error: null };
  },

  async listWithoutFollowup(
    companyId: string,
    _terminalStatusIds: string[],
    scopedAssigneeIds: string[] | null = null,
    page = 1,
    pageSize = 50,
    statusId?: string,
    leadSourceId?: string,
  ): Promise<{ data: LeadListItem[] | null; error: Error | null; total?: number }> {
    const scopedCompanyId = requireCompanyId(companyId);

    if (scopedAssigneeIds !== null && scopedAssigneeIds.length === 0) {
      return { data: [], error: null, total: 0 };
    }

    const supabase = createClient();

    const leadsWithNextAction = await getLeadIdsWithNextActionDate(
      supabase,
      scopedCompanyId,
      scopedAssigneeIds,
    );

    // Fetch ALL scoped leads, then filter and paginate in memory
    // This ensures count and list use the exact same logical result set
    let query = supabase
      .from("leads")
      .select(LEAD_LIST_SELECT)
      .eq("company_id", scopedCompanyId)
      .order("created_at", { ascending: false });

    if (scopedAssigneeIds !== null) {
      query = query.in("assigned_user_id", scopedAssigneeIds);
    }

    if (statusId) {
      query = query.eq("status_id", statusId);
    }

    if (leadSourceId) {
      query = query.eq("lead_source_id", leadSourceId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const rows = (data ?? []) as unknown as LeadListRow[];
    const filtered = rows.filter((r) => !leadsWithNextAction.has(r.id));

    // Apply pagination to filtered results
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginated = filtered.slice(from, to);

    return {
      data: paginated.map(mapListRow),
      error: null,
      total: filtered.length,
    };
  },

  // Sprint 3A (F only): bounded recent lead creations for "Lead Created" events in timeline.
  // Returns data with 3C fields (assigned + team). Read-only, no workflow impact.
  async listRecentCreations(
    companyId: string,
    since: string | null | undefined = undefined,
    limit = 50,
    scopedAssigneeIds: string[] | null = null,
  ): Promise<{ data: Array<Lead & LeadActivityContext & { source_name?: string; status_name?: string }> | null; error: Error | null }> {
    const scopedCompanyId = requireCompanyId(companyId);

    if (scopedAssigneeIds !== null && scopedAssigneeIds.length === 0) {
      return { data: [], error: null };
    }

    const supabase = createClient();

    let query = supabase
      .from("leads")
      .select(
        `id, company_id, assigned_user_id, lead_source_id, full_name, phone, email,
         budget, location, requirement, status_id, remarks, created_by, created_at, updated_at,
         lead_sources(source_name),
         lead_statuses(status_name),
         assigned_user:users!leads_assigned_user_id_fkey(full_name, team_id, team_leader_id)`,
        { count: "exact" }
      )
      .eq("company_id", scopedCompanyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gte("created_at", since);
    }

    if (scopedAssigneeIds !== null) {
      query = query.in("assigned_user_id", scopedAssigneeIds);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error as Error };
    }

    const rows = (data ?? []) as any[];
    const enriched = rows.map((row) => {
      const src = row.lead_sources ? (Array.isArray(row.lead_sources) ? row.lead_sources[0] : row.lead_sources) : null;
      const st = row.lead_statuses ? (Array.isArray(row.lead_statuses) ? row.lead_statuses[0] : row.lead_statuses) : null;
      const au = row.assigned_user ? (Array.isArray(row.assigned_user) ? row.assigned_user[0] : row.assigned_user) : null;
      return {
        ...row,
        source_name: src?.source_name,
        status_name: st?.status_name,
        assigned_user_name: au?.full_name ?? null,
        assigned_user_id: row.assigned_user_id ?? null,
        team_id: au?.team_id ?? null,
        team_leader_id: au?.team_leader_id ?? null,
      };
    });

    return { data: enriched, error: null };
  },
};
