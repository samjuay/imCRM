export type { AuthErrorCode, SignInResult, UserProfile, UserRole } from "./auth";
export type { DbUser, DbUserSession } from "./database";
export type {
  CreateProjectConfigurationInput,
  CreateProjectInput,
  CreateProjectInventoryInput,
  InventoryStatus,
  Project,
  ProjectConfiguration,
  ProjectInventory,
  ProjectStatus,
  UpdateProjectConfigurationInput,
  UpdateProjectInput,
  UpdateProjectInventoryInput,
} from "./project";
export type {
  CreateLeadSourceInput,
  LeadSource,
  UpdateLeadSourceInput,
} from "./lead-source";
export type {
  CreateLeadStatusInput,
  LeadStatus,
  UpdateLeadStatusInput,
} from "./lead-status";
export type {
  CreateFollowupTypeInput,
  FollowupType,
  UpdateFollowupTypeInput,
} from "./followup";
export type {
  PermissionAction,
  PermissionModule,
  RolePermission,
} from "./permissions";
export type {
  CompanyUser,
  CreateLeadFollowupInput,
  CreateLeadInput,
  CreateLeadNoteInput,
  CreateLeadSiteVisitInput,
  CreateLeadStatusUpdateInput,
  FollowupStatus,
  Lead,
  LeadDetail,
  LeadFilters,
  LeadFollowup,
  LeadListItem,
  LeadNote,
  LeadSiteVisit,
  LeadStatusUpdate,
  PaginatedResult,
  SiteVisitStatus,
  UpdateLeadInput,
  // Sprint 3A Activities
  ActivityType,
  ActivityItem,
  ActivityFilters,
  ActivityListParams,
  ActivityCardId,
  ActivityCounts,
  LeadActivityContext,
  LeadFollowupListItem,
  LeadSiteVisitListItem,
  LeadStatusUpdateListItem,
  FollowupActivityItem,
  SiteVisitActivityItem,
  StatusChangeActivityItem,
  LeadCreatedActivityItem,
  LeadAssignedActivityItem,
  BaseActivityItem,
  // Dashboard types
  DashboardLead,
  DashboardCount,
  DashboardState,
} from "./lead";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
};