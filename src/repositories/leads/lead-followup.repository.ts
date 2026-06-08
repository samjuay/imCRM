import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import { normalizeRelation } from "@/lib/database/supabase-relations";
import type {
  CreateLeadFollowupInput,
  FollowupOutcome,
  FollowupStatus,
  LeadFollowup,
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
};