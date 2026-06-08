import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type {
  CreateLeadInput,
  Lead,
  LeadDetail,
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

export const leadRepository = {
  async list(
    companyId: string,
    filters: LeadFilters,
    page: number,
    pageSize: number,
  ): Promise<{ data: PaginatedResult<LeadListItem> | null; error: Error | null }> {
    const scopedCompanyId = requireCompanyId(companyId);
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
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error };
    }

    const total = count ?? 0;
    const rows = (data ?? []) as unknown as LeadListRow[];

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
};