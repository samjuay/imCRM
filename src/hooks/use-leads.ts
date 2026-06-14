"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
const CACHE_TTL = 30000; // 30 seconds

interface CacheEntry {
  result: PaginatedResult<LeadListItem>;
  timestamp: number;
  filters: LeadFilters;
  page: number;
}

const leadsCache = new Map<string, CacheEntry>();

function getCacheKey(companyId: string, filters: LeadFilters, page: number): string {
  return `${companyId}:${JSON.stringify(filters)}:${page}`;
}

function getCachedResult(companyId: string, filters: LeadFilters, page: number): PaginatedResult<LeadListItem> | null {
  const key = getCacheKey(companyId, filters, page);
  const entry = leadsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    leadsCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCachedResult(companyId: string, filters: LeadFilters, page: number, result: PaginatedResult<LeadListItem>) {
  const key = getCacheKey(companyId, filters, page);
  leadsCache.set(key, { result, timestamp: Date.now(), filters, page });
}

function clearCache() {
  leadsCache.clear();
}

export function useLeads(initialFilters: LeadFilters = {}) {
  const user = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize filters from URL search params
  const urlFilters: LeadFilters = {};
  const search = searchParams.get("search");
  const status_id = searchParams.get("status_id");
  const lead_source_id = searchParams.get("lead_source_id");
  const assigned_user_id = searchParams.get("assigned_user_id");
  const pageParam = searchParams.get("page");
  if (search) urlFilters.search = search;
  if (status_id) urlFilters.status_id = status_id;
  if (lead_source_id) urlFilters.lead_source_id = lead_source_id;
  if (assigned_user_id) urlFilters.assigned_user_id = assigned_user_id;
  const initialPage = pageParam ? parseInt(pageParam, 10) : 1;

  // Merge URL filters with initialFilters (URL takes precedence)
  const mergedInitialFilters = { ...initialFilters, ...urlFilters };

  const [filters, setFilters] = useState<LeadFilters>(mergedInitialFilters);
  const [page, setPage] = useState(initialPage);
  const [result, setResult] = useState<PaginatedResult<LeadListItem> | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const companyId = user?.company_id;
  const cacheKeyRef = useRef<string>("");

  // Sync filters/page to URL
  const syncToUrl = useCallback((newFilters: LeadFilters, newPage: number) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set("search", newFilters.search);
    if (newFilters.status_id) params.set("status_id", newFilters.status_id);
    if (newFilters.lead_source_id) params.set("lead_source_id", newFilters.lead_source_id);
    if (newFilters.assigned_user_id) params.set("assigned_user_id", newFilters.assigned_user_id);
    if (newPage > 1) params.set("page", String(newPage));
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(url, { scroll: false });
  }, [router, pathname]);

  // Load leads with caching
  useEffect(() => {
    if (!companyId) {
      return;
    }

    const scopedCompanyId = companyId; // TypeScript narrowing

    let cancelled = false;

    async function loadLeads() {
      const startedAt = performance.now();
      let outcome = "failed";
      console.log('[LEADS] LOAD_START', { filters, page, companyId: scopedCompanyId });
      try {
        // Check cache first
        const cached = getCachedResult(scopedCompanyId, filters, page);
        if (cached) {
          console.log('[LEADS] CACHE_HIT', { filters, page });
          setResult(cached);
          setIsLoading(false);
          console.log('[LEADS] CACHED_DATA_APPLIED');
          return;
        }

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
        setCachedResult(scopedCompanyId, filters, page, data);
        setIsLoading(false);
        console.log('[LEADS] LOAD_COMPLETE');
      } finally {
        const duration = performance.now() - startedAt;
        console.log(
          `[LEADS] LEADS_LIST_FETCH_${scopedCompanyId}: ${duration.toFixed(2)}ms (${outcome})`,
          { filters, page },
        );
      }
    }

    void loadLeads();

    return () => {
      cancelled = true;
    };
  }, [companyId, filters, page, refreshKey]);

  // Load company users (for filters dropdown) - only once per company
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

  const updateFilters = useCallback((next: LeadFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    clearCache(); // Clear cache on manual refresh
    setRefreshKey((k) => k + 1);
  }, []);

  const setPageWithUrl = useCallback((newPage: number) => {
    setPage(newPage);
    syncToUrl(filters, newPage);
  }, [filters, syncToUrl]);

  const updateFiltersWithUrl = useCallback((next: LeadFilters) => {
    setFilters(next);
    setPage(1);
    syncToUrl(next, 1);
  }, [syncToUrl]);

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
    setPage: setPageWithUrl,
    updateFilters: updateFiltersWithUrl,
    refresh,
  };
}