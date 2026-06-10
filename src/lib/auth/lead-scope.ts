import type { UserProfile, UserRole } from "@/types/auth";
import type { CompanyUser } from "@/types/lead";

const UNSCOPED_ROLES: UserRole[] = ["super_admin", "company_admin"];

export function isUnscopedRole(role: UserRole): boolean {
  return UNSCOPED_ROLES.includes(role);
}

export function getTeamSalesExecutiveIds(
  teamLeaderId: string,
  companyUsers: CompanyUser[],
): string[] {
  return companyUsers
    .filter(
      (u) =>
        u.role === "sales_executive" && u.team_leader_id === teamLeaderId,
    )
    .map((u) => u.id);
}

/** Assignee user ids whose leads the current user may view. null = company-wide. */
export function resolveVisibleAssigneeIds(
  profile: UserProfile,
  companyUsers: CompanyUser[],
): string[] | null {
  if (isUnscopedRole(profile.role)) {
    return null;
  }

  if (profile.role === "sales_executive") {
    return [profile.user_id];
  }

  if (profile.role === "team_leader") {
    return [
      profile.user_id,
      ...getTeamSalesExecutiveIds(profile.user_id, companyUsers),
    ];
  }

  return [];
}

/** User ids the current user may assign leads to. null = unrestricted (company admin). */
export function resolveAssignableUserIds(
  profile: UserProfile,
  companyUsers: CompanyUser[],
): string[] | null {
  if (isUnscopedRole(profile.role)) {
    return null;
  }

  if (profile.role === "sales_executive") {
    return [];
  }

  if (profile.role === "team_leader") {
    return [
      profile.user_id,
      ...getTeamSalesExecutiveIds(profile.user_id, companyUsers),
    ];
  }

  return [];
}

export function canViewAssignedLead(
  profile: UserProfile,
  assignedUserId: string | null,
  companyUsers: CompanyUser[],
): boolean {
  if (isUnscopedRole(profile.role)) {
    return true;
  }

  if (!assignedUserId) {
    return false;
  }

  if (profile.role === "sales_executive") {
    return assignedUserId === profile.user_id;
  }

  if (profile.role === "team_leader") {
    if (assignedUserId === profile.user_id) {
      return true;
    }
    const assignee = companyUsers.find((u) => u.id === assignedUserId);
    return assignee?.team_leader_id === profile.user_id;
  }

  return false;
}

export function canAssignToUser(
  profile: UserProfile,
  targetUserId: string,
  companyUsers: CompanyUser[],
): boolean {
  if (profile.role === "sales_executive") {
    return false;
  }

  const assignable = resolveAssignableUserIds(profile, companyUsers);
  if (assignable === null) {
    return true;
  }

  return assignable.includes(targetUserId);
}

export function filterCompanyUsersForScope(
  profile: UserProfile,
  companyUsers: CompanyUser[],
  mode: "view" | "assign",
): CompanyUser[] {
  const ids =
    mode === "assign"
      ? resolveAssignableUserIds(profile, companyUsers)
      : resolveVisibleAssigneeIds(profile, companyUsers);

  if (ids === null) {
    return companyUsers;
  }

  const idSet = new Set(ids);
  return companyUsers.filter((u) => idSet.has(u.id));
}

export function emptyPaginatedResult<T>(page: number, pageSize: number) {
  return {
    data: {
      data: [] as T[],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    },
    error: null,
  };
}
