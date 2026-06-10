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
  team_leader_id: string | null;
  team_leader_name?: string | null;
  status: string;
};

// ---------------------------------------------------------------------------
// Status Update (workflow log for the new Status Update tab - Sprint 2B)
// ---------------------------------------------------------------------------

export type LeadStatusUpdate = {
  id: string;
  lead_id: string;
  company_id: string;
  previous_status: string | null;
  new_status: string;
  outcome: string | null;
  remark: string | null;
  next_followup_date: string | null;
  project_id: string | null;
  project_name?: string | null;
  visit_date: string | null;
  created_by: string;
  created_at: string;
  created_by_name?: string;
  // Sprint 3B assignment audit fields (populated for lead_assigned events)
  previous_assigned_user_id?: string | null;
  new_assigned_user_id?: string | null;
  assigned_by_user_id?: string | null;
  assignment_reason?: string | null;
  previous_assigned_user_name?: string | null;
  new_assigned_user_name?: string | null;
  assigned_by_user_name?: string | null;
};

export type CreateLeadStatusUpdateInput = {
  lead_id: string;
  previous_status?: string | null;
  new_status: string;
  outcome?: string | null;
  remark?: string | null;
  next_followup_date?: string | null;
  project_id?: string | null;
  visit_date?: string | null;
  created_by: string;
  // Sprint 3B assignment audit fields (optional)
  previous_assigned_user_id?: string | null;
  new_assigned_user_id?: string | null;
  assigned_by_user_id?: string | null;
  assignment_reason?: string | null;
};

// ---------------------------------------------------------------------------
// Sprint 3A Activities Module V1 (dashboard aggregates + timeline)
// - Reuses only existing tables (lead_followups, lead_site_visits, lead_status_updates + leads read-only for creations)
// - All new listByCompany methods MUST return the 3C fields (for future Sprint 3C Lead Assignment)
// ---------------------------------------------------------------------------

export type LeadActivityContext = {
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  team_id: string | null;
  team_leader_id: string | null;
  lead_full_name?: string;
};

export type ActivityType =
  | "lead_created"
  | "status_changed"
  | "followup_created"
  | "site_visit_created"
  | "site_visit_completed"
  | "booking_completed"
  | "lead_assigned";  // Sprint 3B: added for assignment audit trail; all prior 3A types unchanged

export type BaseActivityItem = {
  id: string;
  type: ActivityType;
  occurred_at: string;
  lead_id: string;
  lead_full_name?: string;
  lead_status_name?: string;
  created_by_name?: string;
} & LeadActivityContext;

export type FollowupActivityItem = BaseActivityItem & {
  type: "followup_created";
  followup_type_name?: string;
  followup_date: string;
  status: FollowupStatus;
  outcome: FollowupOutcome | null;
  remarks: string | null;
};

export type SiteVisitActivityItem = BaseActivityItem & {
  type: "site_visit_created" | "site_visit_completed";
  visit_date: string;
  visit_status: SiteVisitStatus;
  project_name?: string | null;
  remarks: string | null;
};

export type StatusChangeActivityItem = BaseActivityItem & {
  type: "status_changed" | "booking_completed";
  previous_status: string | null;
  new_status: string;
  outcome: string | null;
  remark: string | null;
  next_followup_date: string | null;
  visit_date: string | null;
  project_name?: string | null;
};

export type LeadCreatedActivityItem = BaseActivityItem & {
  type: "lead_created";
  created_at: string;
  source_name?: string;
  status_name?: string;
};

// Sprint 3B: new activity type for assignment audit (added without altering any prior 3A types or behavior)
export type LeadAssignedActivityItem = BaseActivityItem & {
  type: "lead_assigned";
  previous_assigned_user_id: string | null;
  new_assigned_user_id: string | null;
  assigned_by_user_id: string | null;
  assignment_reason: string | null;
  previous_assigned_user_name?: string | null;
  new_assigned_user_name?: string | null;
  assigned_by_user_name?: string | null;
};

export type ActivityItem =
  | FollowupActivityItem
  | SiteVisitActivityItem
  | StatusChangeActivityItem
  | LeadCreatedActivityItem
  | LeadAssignedActivityItem;  // Sprint 3B addition only

export type ActivityFilters = {
  search?: string | undefined;
  assigned_user_id?: string | undefined;
  activity_types?: ActivityType[];
};

export type ActivityListParams = ActivityFilters & {
  page?: number | undefined;
  pageSize?: number | undefined;
  date_from?: string | undefined;
  date_to?: string | undefined;
};

// Convenience for repo returns (existing types + 3C context)
export type LeadFollowupListItem = LeadFollowup & LeadActivityContext;
export type LeadSiteVisitListItem = LeadSiteVisit & LeadActivityContext;
export type LeadStatusUpdateListItem = LeadStatusUpdate & LeadActivityContext;
