"use client";

import { useEffect, useState } from "react";
import { filterCompanyUsersForScope } from "@/lib/auth/lead-scope";
import { useUser } from "@/hooks/use-user";
import { leadService } from "@/services/leads";
import { userService } from "@/services/user.service";
import type {
  CompanyUser,
  LeadFilters,
  LeadListItem,
  PaginatedResult,
} from "@/types/lead";

const PAGE_SIZE = 25;

export function useLeads(initialFilters: LeadFilters = {}) {
  const user = useUser();
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedResult<LeadListItem> | null>(
    null,
  );
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const companyId = user?.company_id;

  useEffect(() => {
    if (!companyId) {
      return;
    }

    let cancelled = false;

    const scopedCompanyId = companyId;

    async function loadLeads() {
      const startedAt = performance.now();
      let outcome = "failed";
      console.log('[LEADS] LOAD_START', { filters, page, companyId });
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await leadService.list(
          scopedCompanyId,
          filters,
          page,
          PAGE_SIZE,
        );

        outcome = cancelled ? "cancelled" : "completed";
        console.log('[LEADS] QUERY_COMPLETE');

        if (cancelled) {
          console.log('[LEADS] LOAD_CANCELLED');
          return;
        }

        if (fetchError || !data) {
          outcome = "error";
          console.error('[LEADS] LOAD_ERROR', fetchError);
          setError(fetchError?.message ?? "Failed to load leads");
          setIsLoading(false);
          return;
        }

        console.log('[LEADS] LOAD_SUCCESS', { count: data.data?.length ?? 0, total: data.total });
        setResult(data);
        setIsLoading(false);
        console.log('[LEADS] LOAD_COMPLETE');
      } finally {
        const duration = performance.now() - startedAt;
        console.log(
          `[LEADS] LEADS_LIST_FETCH_${companyId}: ${duration.toFixed(2)}ms (${outcome})`,
          { filters, page },
        );
      }
    }

    void loadLeads();

    return () => {
      cancelled = true;
    };
  }, [companyId, filters, page, refreshKey]);

  useEffect(() => {
    if (!companyId || !user) return;

    void userService.getByCompany(companyId).then(({ data }) => {
      if (data) {
        setCompanyUsers(
          filterCompanyUsersForScope(user, data as CompanyUser[], "view"),
        );
      }
    });
  }, [companyId, user]);

  const updateFilters = (next: LeadFilters) => {
    setFilters(next);
    setPage(1);
  };

  const refresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return {
    leads: result?.data ?? [],
    total: result?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: result?.totalPages ?? 1,
    filters,
    companyUsers,
    isLoading,
    error,
    setPage,
    updateFilters,
    refresh,
  };
}
