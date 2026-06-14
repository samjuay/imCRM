import {
  leadFollowupRepository,
  leadNoteRepository,
  leadRepository,
  leadSiteVisitRepository,
  leadStatusUpdateRepository,
} from "@/repositories/leads";
import {
  canAssignToUser,
  canViewAssignedLead,
  emptyPaginatedResult,
  isUnscopedRole,
  resolveVisibleAssigneeIds,
} from "@/lib/auth/lead-scope";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { userService } from "@/services/user.service";
import type { UserProfile } from "@/types/auth";
import type {
  ActivityListParams,
  CompanyUser,
  CreateLeadFollowupInput,
  CreateLeadInput,
  CreateLeadNoteInput,
  CreateLeadSiteVisitInput,
  LeadDetail,
  LeadFilters,
  LeadListItem,
  UpdateLeadFollowupInput,
  UpdateLeadInput,
  UpdateLeadSiteVisitInput,
} from "@/types/lead";

const DEFAULT_PAGE_SIZE = 25;
const ACCESS_DENIED = "Access denied";

type LeadScope = {
  profile: UserProfile;
  visibleAssigneeIds: string[] | null;
  companyUsers: CompanyUser[];
};

async function resolveLeadScope(companyId: string): Promise<LeadScope | null> {
  const profile = useAuthStore.getState().profile;
  if (!profile) {
    return null;
  }

  if (isUnscopedRole(profile.role)) {
    return { profile, visibleAssigneeIds: null, companyUsers: [] };
  }

  const { data: companyUsers } = await userService.getByCompany(companyId);
  return {
    profile,
    visibleAssigneeIds: resolveVisibleAssigneeIds(
      profile,
      companyUsers ?? [],
    ),
    companyUsers: companyUsers ?? [],
  };
}

function isAssigneeFilterAllowed(
  scope: LeadScope,
  assignedUserId?: string,
): boolean {
  if (!assignedUserId || scope.visibleAssigneeIds === null) {
    return true;
  }
  return scope.visibleAssigneeIds.includes(assignedUserId);
}

async function assertLeadViewAccess(
  companyId: string,
  leadId: string,
): Promise<{ lead: LeadDetail | null; error: Error | null }> {
  const scope = await resolveLeadScope(companyId);
  if (!scope) {
    return { lead: null, error: new Error("Not authenticated") };
  }

  const { data: lead, error } = await leadRepository.getById(companyId, leadId);
  if (error || !lead) {
    return { lead: null, error: error ?? new Error("Lead not found") };
  }

  if (
    !canViewAssignedLead(
      scope.profile,
      lead.assigned_user_id,
      scope.companyUsers,
    )
  ) {
    return { lead: null, error: new Error(ACCESS_DENIED) };
  }

  return { lead, error: null };
}

export const leadService = {
  async getDetailBundle(id: string) {
    const result = await leadRepository.getDetailBundle(id);
    if (result.error || !result.data?.lead) {
      return {
        data: null,
        error: result.error ?? new Error("Lead not found"),
      };
    }
    return result;
  },

  async list(
    companyId: string,
    filters: LeadFilters = {},
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ) {
    console.log('[LEADS] QUERY_START', { companyId, filters, page, pageSize });
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      console.log('[LEADS] QUERY_ERROR - no scope');
      return { data: null, error: new Error("Not authenticated") };
    }

    if (!isAssigneeFilterAllowed(scope, filters.assigned_user_id)) {
      console.log('[LEADS] QUERY_COMPLETE - empty (not allowed)');
      return emptyPaginatedResult<LeadListItem>(page, pageSize);
    }

    const result = await leadRepository.list(
      companyId,
      filters,
      page,
      pageSize,
      scope.visibleAssigneeIds,
    );
    console.log('[LEADS] QUERY_COMPLETE', { error: !!result.error, count: result.data?.data?.length ?? 0, total: result.data?.total });
    if (result.error) {
      console.error('[LEADS] QUERY_ERROR', result.error);
    }
    return result;
  },

  async getById(companyId: string, id: string) {
    const { lead, error } = await assertLeadViewAccess(companyId, id);
    if (error) {
      return { data: null, error };
    }
    return { data: lead, error: null };
  },

  async checkDuplicatePhone(
    companyId: string,
    phone: string,
    excludeId?: string,
  ) {
    return leadRepository.phoneExists(companyId, phone, excludeId);
  },

  async create(companyId: string, input: CreateLeadInput) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { data: null, error: new Error("Not authenticated") };
    }

    const assigneeId = input.assigned_user_id ?? null;
    if (
      !assigneeId ||
      !canAssignToUser(scope.profile, assigneeId, scope.companyUsers)
    ) {
      return { data: null, error: new Error(ACCESS_DENIED) };
    }

    return leadRepository.create(companyId, input);
  },

  async update(companyId: string, id: string, input: UpdateLeadInput) {
    const { error: accessError } = await assertLeadViewAccess(companyId, id);
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadRepository.update(companyId, id, input);
  },

  async delete(companyId: string, id: string) {
    const { error: accessError } = await assertLeadViewAccess(companyId, id);
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadRepository.delete(companyId, id);
  },

  async listNotes(companyId: string, leadId: string) {
    const { error: accessError } = await assertLeadViewAccess(
      companyId,
      leadId,
    );
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadNoteRepository.listByLead(companyId, leadId);
  },

  async addNote(companyId: string, input: CreateLeadNoteInput) {
    const { error: accessError } = await assertLeadViewAccess(
      companyId,
      input.lead_id,
    );
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadNoteRepository.create(companyId, input);
  },

  async listFollowups(companyId: string, leadId: string) {
    const { error: accessError } = await assertLeadViewAccess(
      companyId,
      leadId,
    );
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadFollowupRepository.listByLead(companyId, leadId);
  },

  async addFollowup(companyId: string, input: CreateLeadFollowupInput) {
    const { error: accessError } = await assertLeadViewAccess(
      companyId,
      input.lead_id,
    );
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadFollowupRepository.create(companyId, input);
  },

  async listSiteVisits(companyId: string, leadId: string) {
    const { error: accessError } = await assertLeadViewAccess(
      companyId,
      leadId,
    );
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadSiteVisitRepository.listByLead(companyId, leadId);
  },

  async addSiteVisit(companyId: string, input: CreateLeadSiteVisitInput) {
    const { error: accessError } = await assertLeadViewAccess(
      companyId,
      input.lead_id,
    );
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadSiteVisitRepository.create(companyId, input);
  },

  async updateSiteVisit(
    companyId: string,
    id: string,
    input: UpdateLeadSiteVisitInput,
  ) {
    return leadSiteVisitRepository.update(companyId, id, input);
  },

  async updateFollowup(
    companyId: string,
    id: string,
    input: UpdateLeadFollowupInput,
  ) {
    return leadFollowupRepository.update(companyId, id, input);
  },

  async listStatusUpdates(companyId: string, leadId: string) {
    const { error: accessError } = await assertLeadViewAccess(
      companyId,
      leadId,
    );
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadStatusUpdateRepository.listByLead(companyId, leadId);
  },

  async addStatusUpdate(
    companyId: string,
    input: import("@/types/lead").CreateLeadStatusUpdateInput,
  ) {
    const { error: accessError } = await assertLeadViewAccess(
      companyId,
      input.lead_id,
    );
    if (accessError) {
      return { data: null, error: accessError };
    }

    return leadStatusUpdateRepository.create(companyId, input);
  },

  async countFollowupsByCompany(
    companyId: string,
    filters: ActivityListParams & { status?: string } = {},
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { count: 0, error: new Error("Not authenticated") };
    }

    if (!isAssigneeFilterAllowed(scope, filters.assigned_user_id)) {
      return { count: 0, error: null };
    }

    return leadFollowupRepository.countByCompany(
      companyId,
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        status: filters.status as any,
        assigned_user_id: filters.assigned_user_id,
      },
      scope.visibleAssigneeIds,
    );
  },

  async countSiteVisitsByCompany(
    companyId: string,
    filters: ActivityListParams & { visit_status?: string | string[] } = {},
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { count: 0, error: new Error("Not authenticated") };
    }

    if (!isAssigneeFilterAllowed(scope, filters.assigned_user_id)) {
      return { count: 0, error: null };
    }

    return leadSiteVisitRepository.countByCompany(
      companyId,
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        visit_status: filters.visit_status as any,
        assigned_user_id: filters.assigned_user_id,
      },
      scope.visibleAssigneeIds,
    );
  },

  async countWithoutFollowup(
    companyId: string,
    statusId?: string,
    leadSourceId?: string,
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { count: 0, error: new Error("Not authenticated") };
    }

    return leadRepository.countWithoutFollowup(
      companyId,
      [],
      scope.visibleAssigneeIds,
      statusId,
      leadSourceId,
    );
  },

  async listWithoutFollowup(
    companyId: string,
    page = 1,
    pageSize = 50,
    statusId?: string,
    leadSourceId?: string,
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { data: null, error: new Error("Not authenticated") };
    }

    return leadRepository.listWithoutFollowup(
      companyId,
      [],
      scope.visibleAssigneeIds,
      page,
      pageSize,
      statusId,
      leadSourceId,
    );
  },

  async listFollowupsByCompany(
    companyId: string,
    filters: ActivityListParams = {},
    page = 1,
    pageSize = 50,
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { data: null, error: new Error("Not authenticated") };
    }

    if (!isAssigneeFilterAllowed(scope, filters.assigned_user_id)) {
      return { data: [], error: null, total: 0 };
    }

    return leadFollowupRepository.listByCompany(
      companyId,
      filters,
      page,
      pageSize,
      scope.visibleAssigneeIds,
    );
  },

  async listSiteVisitsByCompany(
    companyId: string,
    filters: ActivityListParams = {},
    page = 1,
    pageSize = 50,
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { data: null, error: new Error("Not authenticated") };
    }

    if (!isAssigneeFilterAllowed(scope, filters.assigned_user_id)) {
      return { data: [], error: null, total: 0 };
    }

    return leadSiteVisitRepository.listByCompany(
      companyId,
      filters,
      page,
      pageSize,
      scope.visibleAssigneeIds,
    );
  },

  async listStatusUpdatesByCompany(
    companyId: string,
    filters: ActivityListParams = {},
    page = 1,
    pageSize = 100,
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { data: null, error: new Error("Not authenticated") };
    }

    if (!isAssigneeFilterAllowed(scope, filters.assigned_user_id)) {
      return { data: [], error: null, total: 0 };
    }

    return leadStatusUpdateRepository.listByCompany(
      companyId,
      filters,
      page,
      pageSize,
      scope.visibleAssigneeIds,
    );
  },

  async listRecentLeadCreations(
    companyId: string,
    since: string | null | undefined = undefined,
    limit = 50,
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { data: null, error: new Error("Not authenticated") };
    }

    return leadRepository.listRecentCreations(
      companyId,
      since,
      limit,
      scope.visibleAssigneeIds,
    );
  },

  async listRecentActivities(companyId: string, limit = 50) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return {
        followups: [],
        siteVisits: [],
        statusUpdates: [],
      };
    }

    const [followups, visits, updates] = await Promise.all([
      leadFollowupRepository.listByCompany(
        companyId,
        {},
        1,
        limit,
        scope.visibleAssigneeIds,
      ),
      leadSiteVisitRepository.listByCompany(
        companyId,
        {},
        1,
        limit,
        scope.visibleAssigneeIds,
      ),
      leadStatusUpdateRepository.listByCompany(
        companyId,
        {},
        1,
        limit,
        scope.visibleAssigneeIds,
      ),
    ]);
    return {
      followups: followups.data ?? [],
      siteVisits: visits.data ?? [],
      statusUpdates: updates.data ?? [],
    };
  },

  async assignLead(
    companyId: string,
    leadId: string,
    newAssignedUserId: string | null,
    assignedByUserId: string,
    reason?: string | null,
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return { success: false, error: new Error("Not authenticated") };
    }

    if (scope.profile.role === "sales_executive") {
      return {
        success: false,
        error: new Error("Sales executives cannot assign leads"),
      };
    }

    if (
      newAssignedUserId &&
      !canAssignToUser(scope.profile, newAssignedUserId, scope.companyUsers)
    ) {
      return { success: false, error: new Error(ACCESS_DENIED) };
    }

    const { lead: currentLead, error: accessError } =
      await assertLeadViewAccess(companyId, leadId);
    if (accessError || !currentLead) {
      return { success: false, error: accessError ?? new Error(ACCESS_DENIED) };
    }

    const previousAssigned = currentLead.assigned_user_id ?? null;

    const { error: updateErr } = await leadRepository.update(companyId, leadId, {
      assigned_user_id: newAssignedUserId,
    } as UpdateLeadInput);
    if (updateErr) {
      return { success: false, error: updateErr };
    }

    const { error: logErr } = await leadStatusUpdateRepository.create(companyId, {
      lead_id: leadId,
      previous_status: currentLead.status_name ?? null,
      new_status: currentLead.status_name ?? "Assigned",
      created_by: assignedByUserId,
      previous_assigned_user_id: previousAssigned,
      new_assigned_user_id: newAssignedUserId,
      assigned_by_user_id: assignedByUserId,
      assignment_reason: reason ?? null,
    } as import("@/types/lead").CreateLeadStatusUpdateInput);

    if (logErr) {
      return { success: false, error: logErr };
    }

    return { success: true };
  },

  async bulkAssignLeads(
    companyId: string,
    leadIds: string[],
    newAssignedUserId: string | null,
    assignedByUserId: string,
    reason?: string | null,
  ) {
    const scope = await resolveLeadScope(companyId);
    if (!scope) {
      return {
        success: false,
        error: new Error("Not authenticated"),
        assignedCount: 0,
      };
    }

    if (scope.profile.role === "sales_executive") {
      return {
        success: false,
        error: new Error("Sales executives cannot assign leads"),
        assignedCount: 0,
      };
    }

    if (
      newAssignedUserId &&
      !canAssignToUser(scope.profile, newAssignedUserId, scope.companyUsers)
    ) {
      return {
        success: false,
        error: new Error(ACCESS_DENIED),
        assignedCount: 0,
      };
    }

    if (!leadIds || leadIds.length === 0) {
      return { success: true, assignedCount: 0 };
    }

    for (const leadId of leadIds) {
      const { error: accessError } = await assertLeadViewAccess(
        companyId,
        leadId,
      );
      if (accessError) {
        return { success: false, error: accessError, assignedCount: 0 };
      }
    }

    try {
      const { error } = await createClient().rpc("bulk_assign_leads", {
        p_lead_ids: leadIds,
        p_new_assigned_user_id: newAssignedUserId,
        p_assigned_by_user_id: assignedByUserId,
        p_reason: reason ?? null,
      });

      if (error) {
        return { success: false, error, assignedCount: 0 };
      }

      return { success: true, assignedCount: leadIds.length };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e : new Error(String(e)),
        assignedCount: 0,
      };
    }
  },
};
