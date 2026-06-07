export type LeadStatus = {
  id: string;
  company_id: string;
  status_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type CreateLeadStatusInput = {
  status_name: string;
  display_order?: number;
  is_active?: boolean;
};

export type UpdateLeadStatusInput = Partial<CreateLeadStatusInput>;