export type LeadSource = {
  id: string;
  company_id: string;
  source_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type CreateLeadSourceInput = {
  source_name: string;
  is_active?: boolean;
};

export type UpdateLeadSourceInput = Partial<CreateLeadSourceInput> & {
  archived_at?: string | null;
};