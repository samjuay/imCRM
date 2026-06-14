"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { filterCompanyUsersForScope } from "@/lib/auth/lead-scope";
import { useUser } from "@/hooks/use-user";
import { useMasterDataStore } from "@/store/master-data-store";
import { leadService } from "@/services/leads";
import { userService } from "@/services/user.service";
import type {
  ActivityCardId,
  ActivityCounts,
  ActivityFilters,
  CompanyUser,
  FollowupActivityItem,
  LeadFollowupListItem,
  LeadListItem,
  LeadSiteVisitListItem,
  LeadSource,
  LeadStatus,
  SiteVisitActivityItem,
} from "@/types";

const DETAIL_PAGE_SIZE = 50;

function getTodayBounds() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const weekEnd = new Date(endOfToday);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return {
    todayStart: startOfToday.toISOString(),
    todayEnd: endOfToday.toISOString(),
    tomorrowStart: endOfToday.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };
}

function mapFollowupToListItem(f: LeadFollowupListItem): FollowupActivityItem {
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

function mapSiteVisitToListItem(v: LeadSiteVisitListItem): SiteVisitActivityItem {
  return {
    id: v.id,
    type: v.visit_status === "done" ? "site_visit_completed" : "site_visit_created",
    occurred_at: v.visit_status === "done" && v.visit_date ? v.visit_date : v.created_at,
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

export function useActivities() {
  const user = useUser();
  const companyId = user?.company_id;

  const [filters, setFilters] = useState<ActivityFilters>({});
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [isCountsLoading, setIsCountsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [counts, setCounts] = useState<ActivityCounts>({
    overdueFollowups: 0,
    followupsToday: 0,
    leadsWithoutFollowup: 0,
    siteVisitsToday: 0,
    upcomingFollowups: 0,
    upcomingSiteVisits: 0,
  });

  const [detailData, setDetailData] = useState<{
    cardId: ActivityCardId;
    items: (FollowupActivityItem | SiteVisitActivityItem)[];
    leads: LeadListItem[];
  } | null>(null);

  const masterLeadStatuses = useMasterDataStore((s) => s.leadStatuses);
  const masterLeadSources = useMasterDataStore((s) => s.leadSources);

  const loadCounts = useCallback(async () => {
    if (!companyId) return;

    let cancelled = false;

    setIsCountsLoading(true);
    setError(null);

    try {
      const bounds = getTodayBounds();

      const [
        overdueRes,
        dueTodayRes,
        noFollowupRes,
        svTodayRes,
        upFuRes,
        upSvRes,
        usersRes,
        sourcesRes,
        statusesRes,
      ] = await Promise.all([
        leadService.countFollowupsByCompany(companyId, {
          date_to: bounds.todayStart,
          status: "pending",
          assigned_user_id: filters.assigned_user_id,
          search: filters.search,
        } as any),
        leadService.countFollowupsByCompany(companyId, {
          date_from: bounds.todayStart,
          date_to: bounds.todayEnd,
          status: "pending",
          assigned_user_id: filters.assigned_user_id,
          search: filters.search,
        } as any),
        leadService.countWithoutFollowup(companyId, filters.status_id, filters.lead_source_id),
        leadService.countSiteVisitsByCompany(companyId, {
          date_from: bounds.todayStart,
          date_to: bounds.todayEnd,
          visit_status: ["planned", "rescheduled"],
          assigned_user_id: filters.assigned_user_id,
          search: filters.search,
        } as any),
        leadService.countFollowupsByCompany(companyId, {
          date_from: bounds.tomorrowStart,
          date_to: bounds.weekEnd,
          status: "pending",
          assigned_user_id: filters.assigned_user_id,
          search: filters.search,
        } as any),
        leadService.countSiteVisitsByCompany(companyId, {
          date_from: bounds.tomorrowStart,
          date_to: bounds.weekEnd,
          visit_status: ["planned", "rescheduled"],
          assigned_user_id: filters.assigned_user_id,
          search: filters.search,
        } as any),
        userService.getByCompany(companyId),
        userService.getLeadSources(companyId),
        userService.getLeadStatuses(companyId),
      ]);

      if (cancelled) return;

      setCounts({
        overdueFollowups: overdueRes.count ?? 0,
        followupsToday: dueTodayRes.count ?? 0,
        leadsWithoutFollowup: noFollowupRes.count ?? 0,
        siteVisitsToday: svTodayRes.count ?? 0,
        upcomingFollowups: upFuRes.count ?? 0,
        upcomingSiteVisits: upSvRes.count ?? 0,
      });

      if (usersRes.data && user) {
        setCompanyUsers(
          filterCompanyUsersForScope(user, usersRes.data as CompanyUser[], "view"),
        );
      }

      if (sourcesRes.data) {
        setLeadSources(sourcesRes.data as LeadSource[]);
      }

      if (statusesRes.data) {
        setLeadStatuses(statusesRes.data as LeadStatus[]);
      }

      if (!cancelled) {
        setIsCountsLoading(false);
      }
    } catch (e: any) {
      if (!cancelled) {
        setError(e?.message ?? "Failed to load activities");
        setIsCountsLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [companyId, filters, user, refreshKey]);

  const loadDetail = useCallback(
    async (cardId: ActivityCardId) => {
      if (!companyId) return;

      let cancelled = false;

      setIsDetailLoading(true);
      setError(null);

      try {
        const bounds = getTodayBounds();

        switch (cardId) {
          case "overdue-followups": {
            const res = await leadService.listFollowupsByCompany(companyId, {
              date_to: bounds.todayStart,
              status: "pending",
              assigned_user_id: filters.assigned_user_id,
              search: filters.search,
            } as any, 1, DETAIL_PAGE_SIZE);
            if (cancelled) return;
            setDetailData({
              cardId,
              items: (res.data ?? []).map(mapFollowupToListItem),
              leads: [],
            });
            break;
          }
          case "followups-today": {
            const res = await leadService.listFollowupsByCompany(companyId, {
              date_from: bounds.todayStart,
              date_to: bounds.todayEnd,
              status: "pending",
              assigned_user_id: filters.assigned_user_id,
              search: filters.search,
            } as any, 1, DETAIL_PAGE_SIZE);
            if (cancelled) return;
            setDetailData({
              cardId,
              items: (res.data ?? []).map(mapFollowupToListItem),
              leads: [],
            });
            break;
          }
          case "leads-without-followup": {
            const res = await leadService.listWithoutFollowup(
              companyId,
              1,
              DETAIL_PAGE_SIZE,
              filters.status_id,
              filters.lead_source_id,
            );
            if (cancelled) return;
            setDetailData({
              cardId,
              items: [],
              leads: res.data ?? [],
            });
            break;
          }
          case "site-visits-today": {
            const res = await leadService.listSiteVisitsByCompany(companyId, {
              date_from: bounds.todayStart,
              date_to: bounds.todayEnd,
              visit_status: ["planned", "rescheduled"],
              assigned_user_id: filters.assigned_user_id,
              search: filters.search,
            } as any, 1, DETAIL_PAGE_SIZE);
            if (cancelled) return;
            setDetailData({
              cardId,
              items: (res.data ?? []).map(mapSiteVisitToListItem),
              leads: [],
            });
            break;
          }
          case "upcoming-followups": {
            const res = await leadService.listFollowupsByCompany(companyId, {
              date_from: bounds.tomorrowStart,
              date_to: bounds.weekEnd,
              status: "pending",
              assigned_user_id: filters.assigned_user_id,
              search: filters.search,
            } as any, 1, DETAIL_PAGE_SIZE);
            if (cancelled) return;
            setDetailData({
              cardId,
              items: (res.data ?? []).map(mapFollowupToListItem),
              leads: [],
            });
            break;
          }
          case "upcoming-site-visits": {
            const res = await leadService.listSiteVisitsByCompany(companyId, {
              date_from: bounds.tomorrowStart,
              date_to: bounds.weekEnd,
              visit_status: ["planned", "rescheduled"],
              assigned_user_id: filters.assigned_user_id,
              search: filters.search,
            } as any, 1, DETAIL_PAGE_SIZE);
            if (cancelled) return;
            setDetailData({
              cardId,
              items: (res.data ?? []).map(mapSiteVisitToListItem),
              leads: [],
            });
            break;
          }
        }

        if (!cancelled) {
          setIsDetailLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load details");
          setIsDetailLoading(false);
        }
      }

      return () => {
        cancelled = true;
      };
    },
    [companyId, filters],
  );

  const clearDetail = useCallback(() => {
    setDetailData(null);
  }, []);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    void loadCounts().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [loadCounts]);

  const updateFilters = useCallback((next: ActivityFilters) => {
    setFilters(next);
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setDetailData(null);
  }, []);

  return {
    filters,
    companyUsers,
    leadSources,
    leadStatuses,
    updateFilters,
    refresh,

    isCountsLoading,
    isDetailLoading,
    error,

    counts,
    detailData,

    loadDetail,
    clearDetail,
  };
}
