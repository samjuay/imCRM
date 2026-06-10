"use client";

import { useEffect, useState } from "react";
import { filterCompanyUsersForScope } from "@/lib/auth/lead-scope";
import { useUser } from "@/hooks/use-user";
import { leadService } from "@/services/leads";
import { userService } from "@/services/user.service";
import type {
  ActivityFilters,
  ActivityItem,
  ActivityType,
  CompanyUser,
  FollowupActivityItem,
  LeadCreatedActivityItem,
  LeadFollowupListItem,
  LeadSiteVisitListItem,
  LeadStatusUpdateListItem,
  SiteVisitActivityItem,
  StatusChangeActivityItem,
} from "@/types/lead";

const PAGE_SIZE_SMALL = 20; // for categorized dashboard sections
const TIMELINE_LIMIT = 40;

function getTodayBounds() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  return {
    todayStart: startOfToday.toISOString(),
    todayEnd: endOfToday.toISOString(),
    tomorrowStart: endOfToday.toISOString(),
  };
}

function mapFollowupToActivity(f: LeadFollowupListItem): FollowupActivityItem {
  return {
    id: f.id,
    type: "followup_created",
    occurred_at: f.created_at,
    lead_id: f.lead_id,
    lead_full_name: f.lead_full_name,
    assigned_user_id: f.assigned_user_id,
    assigned_user_name: f.assigned_user_name,
    team_id: f.team_id,
    team_leader_id: f.team_leader_id,
    followup_type_name: f.followup_type_name,
    followup_date: f.followup_date,
    status: f.status,
    outcome: f.outcome,
    remarks: f.remarks,
    created_by_name: f.created_by_name,
  };
}

function mapSiteVisitToActivity(v: LeadSiteVisitListItem): SiteVisitActivityItem {
  const isCompleted = v.visit_status === "done";
  return {
    id: v.id,
    type: isCompleted ? "site_visit_completed" : "site_visit_created",
    occurred_at: isCompleted && v.visit_date ? v.visit_date : v.created_at,
    lead_id: v.lead_id,
    lead_full_name: v.lead_full_name,
    assigned_user_id: v.assigned_user_id,
    assigned_user_name: v.assigned_user_name,
    team_id: v.team_id,
    team_leader_id: v.team_leader_id,
    visit_date: v.visit_date,
    visit_status: v.visit_status,
    project_name: v.project_name,
    remarks: v.remarks,
    created_by_name: v.created_by_name,
  };
}

function mapStatusUpdateToActivity(u: LeadStatusUpdateListItem): StatusChangeActivityItem {
  const isBooking = u.new_status === "Booked";
  return {
    id: u.id,
    type: isBooking ? "booking_completed" : "status_changed",
    occurred_at: u.created_at,
    lead_id: u.lead_id,
    lead_full_name: u.lead_full_name,
    assigned_user_id: u.assigned_user_id,
    assigned_user_name: u.assigned_user_name,
    team_id: u.team_id,
    team_leader_id: u.team_leader_id,
    previous_status: u.previous_status,
    new_status: u.new_status,
    outcome: u.outcome,
    remark: u.remark,
    next_followup_date: u.next_followup_date,
    visit_date: u.visit_date,
    project_name: u.project_name,
    created_by_name: u.created_by_name,
  };
}

function mapLeadCreationToActivity(l: any): LeadCreatedActivityItem {
  return {
    id: `lead-${l.id}`,
    type: "lead_created",
    occurred_at: l.created_at,
    lead_id: l.id,
    lead_full_name: l.full_name,
    lead_status_name: l.status_name,
    assigned_user_id: l.assigned_user_id,
    assigned_user_name: l.assigned_user_name,
    team_id: l.team_id,
    team_leader_id: l.team_leader_id,
    created_at: l.created_at,
    source_name: l.source_name,
    status_name: l.status_name,
    created_by_name: undefined, // lead has created_by but not enriched here for V1
  };
}

// Sprint 3B: map assignment audit rows (from lead_status_updates) to lead_assigned
// Existing 3A mappers for other types are untouched.
function mapLeadAssignedToActivity(u: any): any {
  return {
    id: u.id,
    type: "lead_assigned",
    occurred_at: u.created_at,
    lead_id: u.lead_id,
    lead_full_name: u.lead_full_name,
    assigned_user_id: u.assigned_user_id,
    assigned_user_name: u.assigned_user_name,
    team_id: u.team_id,
    team_leader_id: u.team_leader_id,
    previous_assigned_user_id: u.previous_assigned_user_id,
    new_assigned_user_id: u.new_assigned_user_id,
    assigned_by_user_id: u.assigned_by_user_id,
    assignment_reason: u.assignment_reason,
    previous_assigned_user_name: u.previous_assigned_user_name,
    new_assigned_user_name: u.new_assigned_user_name,
    assigned_by_user_name: u.assigned_by_user_name,
    created_by_name: u.created_by_name,
  };
}

export function useActivities(initialFilters: ActivityFilters = {}) {
  const user = useUser();
  const [filters, setFilters] = useState<ActivityFilters>(initialFilters);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Categorized data (dashboard-first)
  const [followupsDueToday, setFollowupsDueToday] = useState<FollowupActivityItem[]>([]);
  const [overdueFollowups, setOverdueFollowups] = useState<FollowupActivityItem[]>([]);
  const [siteVisitsToday, setSiteVisitsToday] = useState<SiteVisitActivityItem[]>([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState<FollowupActivityItem[]>([]);
  const [upcomingSiteVisits, setUpcomingSiteVisits] = useState<SiteVisitActivityItem[]>([]);

  // F: Recent Activity Timeline (unified, 6 event types)
  const [recentTimeline, setRecentTimeline] = useState<ActivityItem[]>([]);

  const companyId = user?.company_id;

  useEffect(() => {
    if (!companyId) {
      return;
    }

    let cancelled = false;
    const bounds = getTodayBounds();

    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        // Parallel loads for the 5 categorized sections + timeline pieces
        const [
          dueTodayRes,
          overdueRes,
          visitsTodayRes,
          upcomingFuRes,
          upcomingSvRes,
          recentPieces,
          creationsRes,
          usersRes,
        ] = await Promise.all([
          // A. Followups Due Today
          // @ts-expect-error - filter value undefined compatibility for V1
          leadService.listFollowupsByCompany(companyId, {
            date_from: bounds.todayStart,
            date_to: bounds.todayEnd,
            status: "pending",
            assigned_user_id: filters.assigned_user_id as any,
            search: filters.search as any,
          } as any, 1, PAGE_SIZE_SMALL),

          // B. Overdue Followups
          // @ts-expect-error - filter value undefined compatibility for V1
          leadService.listFollowupsByCompany(companyId, {
            date_to: bounds.todayStart,
            status: "pending",
            assigned_user_id: filters.assigned_user_id as any,
            search: filters.search as any,
          } as any, 1, PAGE_SIZE_SMALL),

          // C. Site Visits Today
          // @ts-expect-error - filter value undefined compatibility for V1
          leadService.listSiteVisitsByCompany(companyId, {
            date_from: bounds.todayStart,
            date_to: bounds.todayEnd,
            visit_status: ["planned", "rescheduled"] as any,
            assigned_user_id: filters.assigned_user_id as any,
            search: filters.search as any,
          } as any, 1, PAGE_SIZE_SMALL),

          // D. Upcoming Followups
          // @ts-expect-error - filter value undefined compatibility for V1
          leadService.listFollowupsByCompany(companyId, {
            date_from: bounds.tomorrowStart,
            status: "pending",
            assigned_user_id: filters.assigned_user_id as any,
            search: filters.search as any,
          } as any, 1, PAGE_SIZE_SMALL),

          // E. Upcoming Site Visits
          // @ts-expect-error - filter value undefined compatibility for V1
          leadService.listSiteVisitsByCompany(companyId, {
            date_from: bounds.tomorrowStart,
            visit_status: ["planned", "rescheduled"] as any,
            assigned_user_id: filters.assigned_user_id as any,
            search: filters.search as any,
          } as any, 1, PAGE_SIZE_SMALL),

          // F pieces (recent from three tables)
          leadService.listRecentActivities(companyId as string, TIMELINE_LIMIT),

          // Lead Created events (F)
          leadService.listRecentLeadCreations(companyId as string, null as any, TIMELINE_LIMIT),

          // For filter dropdown
          userService.getByCompany(companyId as string),
        ]);

        if (cancelled) return;

        // Map categorized
        const dueTodayItems: FollowupActivityItem[] = (dueTodayRes.data ?? []).map(mapFollowupToActivity);
        const overdueItems: FollowupActivityItem[] = (overdueRes.data ?? []).map(mapFollowupToActivity);
        const svTodayItems: SiteVisitActivityItem[] = (visitsTodayRes.data ?? []).map(mapSiteVisitToActivity);
        const upFuItems: FollowupActivityItem[] = (upcomingFuRes.data ?? []).map(mapFollowupToActivity);
        const upSvItems: SiteVisitActivityItem[] = (upcomingSvRes.data ?? []).map(mapSiteVisitToActivity);

        setFollowupsDueToday(dueTodayItems);
        setOverdueFollowups(overdueItems);
        setSiteVisitsToday(svTodayItems);
        setUpcomingFollowups(upFuItems);
        setUpcomingSiteVisits(upSvItems);

        // Assemble unified timeline (F) - 6 event types
        const { followups = [], siteVisits = [], statusUpdates = [] } = recentPieces as any;
        const leadCreations = (creationsRes.data ?? []) as any[];

        const timeline: ActivityItem[] = [
          // Sprint 3B: assignment rows (those with the new audit fields) map to lead_assigned;
          // all other status updates continue to use the original 3A mapper unchanged.
          ...statusUpdates.map((u: any) =>
            u.previous_assigned_user_id || u.new_assigned_user_id
              ? mapLeadAssignedToActivity(u)
              : mapStatusUpdateToActivity(u)
          ),
          ...followups.map(mapFollowupToActivity),
          ...siteVisits.map(mapSiteVisitToActivity),
          ...leadCreations.map(mapLeadCreationToActivity),
        ];

        // Sort most recent first, dedupe by id+type (simple), take limit
        timeline.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
        const seen = new Set<string>();
        const deduped = timeline.filter((it) => {
          const key = `${it.type}:${it.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, TIMELINE_LIMIT);

        setRecentTimeline(deduped);

        if (usersRes.data && user) {
          setCompanyUsers(
            filterCompanyUsersForScope(
              user,
              usersRes.data as CompanyUser[],
              "view",
            ),
          );
        }

        setIsLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load activities");
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [companyId, filters, refreshKey, user]);

  const updateFilters = (next: ActivityFilters) => {
    setFilters(next);
  };

  const refresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    // Filters
    filters,
    companyUsers,
    updateFilters,
    clearFilters,
    refresh,

    // Loading / error
    isLoading,
    error,

    // A-E categorized (dashboard-first)
    followupsDueToday,
    overdueFollowups,
    siteVisitsToday,
    upcomingFollowups,
    upcomingSiteVisits,

    // F
    recentTimeline,

    // Counts for badges etc.
    counts: {
      dueToday: followupsDueToday.length,
      overdue: overdueFollowups.length,
      visitsToday: siteVisitsToday.length,
      upcomingFollowups: upcomingFollowups.length,
      upcomingSiteVisits: upcomingSiteVisits.length,
      timeline: recentTimeline.length,
    },
  };
}
