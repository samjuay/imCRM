"use client";

import { useEffect, useState } from "react";
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
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await leadService.list(
        scopedCompanyId,
        filters,
        page,
        PAGE_SIZE,
      );

      if (cancelled) return;

      if (fetchError || !data) {
        setError(fetchError?.message ?? "Failed to load leads");
        setIsLoading(false);
        return;
      }

      setResult(data);
      setIsLoading(false);
    }

    void loadLeads();

    return () => {
      cancelled = true;
    };
  }, [companyId, filters, page, refreshKey]);

  useEffect(() => {
    if (!companyId) return;

    void userService.getByCompany(companyId).then(({ data }) => {
      if (data) {
        setCompanyUsers(data as CompanyUser[]);
      }
    });
  }, [companyId]);

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