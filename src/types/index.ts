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