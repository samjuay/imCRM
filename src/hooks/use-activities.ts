"use client";

import { useCallback, useEffect, useState } from "react";
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
  DashboardCount,
  DashboardLead,
  LeadSource,
  LeadStatus,
} from "@/types";

const DETAIL_PAGE_SIZE = 50;

const CATEGORY_KEYS: ActivityCardId[] = [
  "overdue-followups",
  "followups-today",
  "site-visits-today",
  "leads-without-followup",
  "upcoming-followups",
  "upcoming-site-visits",
];

const CATEGORY_TO_RPC: Record<ActivityCardId, string> = {
  "overdue-followups": "overdue",
  "followups-today": "due_today",
  "site-visits-today": "site_visit_today",
  "leads-without-followup": "no_action",
  "upcoming-followups": "upcoming_followup",
  "upcoming-site-visits": "upcoming_site_visit",
};

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

  const [counts, setCounts] = useState<DashboardCount>({
    overdue: 0,
    due_today: 0,
    site_visit_today: 0,
    upcoming_followup: 0,
    upcoming_site_visit: 0,
    no_action: 0,
  });

  const [detailData, setDetailData] = useState<{
    cardId: ActivityCardId;
    leads: DashboardLead[];
    total: number;
  } | null>(null);

  const loadCounts = useCallback(async () => {
    if (!companyId) return;

    let cancelled = false;

    setIsCountsLoading(true);
    setError(null);

    try {
      const res = await leadService.countDashboardState(
        companyId,
        filters.status_id,
        filters.lead_source_id,
        filters.assigned_user_id,
        filters.search,
      );

      if (cancelled) return;

      setCounts({
        overdue: res.counts.overdue ?? 0,
        due_today: res.counts.due_today ?? 0,
        site_visit_today: res.counts.site_visit_today ?? 0,
        upcoming_followup: res.counts.upcoming_followup ?? 0,
        upcoming_site_visit: res.counts.upcoming_site_visit ?? 0,
        no_action: res.counts.no_action ?? 0,
      });

      // Load master data for filters
      const [usersRes, sourcesRes, statusesRes] = await Promise.all([
        userService.getByCompany(companyId),
        userService.getLeadSources(companyId),
        userService.getLeadStatuses(companyId),
      ]);

      if (cancelled) return;

      if (usersRes.data) {
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
  }, [companyId, filters, refreshKey, user]);

  const loadDetail = useCallback(
    async (cardId: ActivityCardId, overrideFilters?: ActivityFilters) => {
      if (!companyId) return;

      let cancelled = false;

      setIsDetailLoading(true);
      setError(null);

      try {
        const rpcCategory = CATEGORY_TO_RPC[cardId];
        const activeFilters = overrideFilters ?? filters;
        const res = await leadService.listDashboardState(
          companyId,
          rpcCategory,
          1,
          50,
          activeFilters.status_id,
          activeFilters.lead_source_id,
          activeFilters.assigned_user_id,
          activeFilters.search,
        );

        if (cancelled) return;

        setDetailData({
          cardId,
          leads: res.data ?? [],
          total: res.total ?? 0,
        });

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
    void loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    if (detailData?.cardId) {
      void loadDetail(detailData.cardId);
    }
  }, [detailData?.cardId, loadDetail]);

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