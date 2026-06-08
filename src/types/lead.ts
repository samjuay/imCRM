export const FOLLOWUP_STATUSES = ["pending", "completed", "cancelled"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const SITE_VISIT_STATUSES = [
  "planned",
  "done",
  "cancelled",
  "rescheduled",
] as const;
export type SiteVisitStatus = (typeof SITE_VISIT_STATUSES)[number];

export const FOLLOWUP_OUTCOMES = [
  "pending",
  "connected",
  "no_response",
  "interested",
  "not_interested",
  "rescheduled",
  "cancelled",
] as const;
export type FollowupOutcome = (typeof FOLLOWUP_OUTCOMES)[number];

export type Lead = {
  id: string;
  company_id: string;
  assigned_user_id: string | null;
  lead_source_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  budget: number | null;
  location: string | null;
  requirement: string | null;
  status_id: string;
  remarks: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type LeadListItem = Lead & {
  source_name: string;
  status_name: string;
  assigned_user_name: string | null;
};

export type LeadDetail = Lead & {
  source_name: string;
  status_name: string;
  assigned_user_name: string | null;
  created_by_name: string;
};

export type LeadNote = {
  id: string;
  lead_id: string;
  company_id: string;
  note: string;
  created_by: string;
  created_at: string;
  created_by_name?: string;
};

export type LeadFollowup = {
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
  followup_type_name?: string;
  created_by_name?: string;
};

export type UpdateLeadFollowupInput = {
  status?: FollowupStatus;
  outcome?: FollowupOutcome | null;
  followup_date?: string;
  remarks?: string | null;
};

export type UpdateLeadSiteVisitInput = {
  visit_status?: SiteVisitStatus;
  visit_date?: string;
  remarks?: string | null;
};

export type LeadSiteVisit = {
  id: string;
  lead_id: string;
  company_id: string;
  visit_date: string;
  project_id: string | null;
  remarks: string | null;
  visit_status: SiteVisitStatus;
  created_by: string;
  created_at: string;
  project_name?: string | null;
  created_by_name?: string;
};

export type CreateLeadInput = {
  full_name: string;
  phone: string;
  email?: string | null;
  lead_source_id: string;
  status_id: string;
  budget?: number | null;
  location?: string | null;
  requirement?: string | null;
  remarks?: string | null;
  assigned_user_id?: string | null;
  created_by: string;
};

export type UpdateLeadInput = Partial<
  Omit<CreateLeadInput, "created_by" | "phone"> & { phone?: string }
>;

export type LeadFilters = {
  search?: string;
  status_id?: string;
  lead_source_id?: string;
  assigned_user_id?: string;
};

export type LeadListParams = LeadFilters & {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateLeadNoteInput = {
  lead_id: string;
  note: string;
  created_by: string;
};

export type CreateLeadFollowupInput = {
  lead_id: string;
  followup_type_id: string;
  followup_date: string;
  remarks?: string | null;
  status?: FollowupStatus;
  created_by: string;
};

export type CreateLeadSiteVisitInput = {
  lead_id: string;
  visit_date: string;
  project_id?: string | null;
  remarks?: string | null;
  visit_status?: SiteVisitStatus;
  created_by: string;
};

export type CompanyUser = {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  role: string;
  team_id: string | null;
  status: string;
};