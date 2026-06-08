import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import { normalizeRelation } from "@/lib/database/supabase-relations";
import type { CreateLeadNoteInput, LeadNote } from "@/types/lead";

type RawNoteRow = {
  id: string;
  lead_id: string;
  company_id: string;
  note: string;
  created_by: string;
  created_at: string;
  creator: { full_name: string } | { full_name: string }[] | null;
};

export const leadNoteRepository = {
  async listByLead(companyId: string, leadId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lead_notes")
      .select(
        "id, lead_id, company_id, note, created_by, created_at, creator:users!lead_notes_created_by_fkey(full_name)",
      )
      .eq("company_id", scopedCompanyId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const rows = (data ?? []) as unknown as RawNoteRow[];
    return {
      data: rows.map((row): LeadNote => ({
        id: row.id,
        lead_id: row.lead_id,
        company_id: row.company_id,
        note: row.note,
        created_by: row.created_by,
        created_at: row.created_at,
        created_by_name: normalizeRelation(row.creator)?.full_name,
      })),
      error: null,
    };
  },

  async create(companyId: string, input: CreateLeadNoteInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("lead_notes")
      .insert({ ...input, company_id: scopedCompanyId })
      .select("id")
      .single();
  },
};