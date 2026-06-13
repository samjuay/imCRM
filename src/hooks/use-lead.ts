"use client";

import { useEffect, useState } from "react";
import { filterCompanyUsersForScope } from "@/lib/auth/lead-scope";
import { useUser } from "@/hooks/use-user";
import { leadService } from "@/services/leads";
import { userService } from "@/services/user.service";
import { projectService } from "@/services/projects";
import type {
  CompanyUser,
  LeadDetail,
  LeadDetailBundle,
  LeadFollowup,
  LeadNote,
  LeadSiteVisit,
  LeadStatusUpdate,
} from "@/types/lead";
import type { Project } from "@/types/project";

// Simple in-memory cache for lead details
interface LeadCacheEntry {
  lead: LeadDetail;
  notes: LeadNote[];
  followups: LeadFollowup[];
  siteVisits: LeadSiteVisit[];
  statusUpdates: LeadStatusUpdate[];
  timestamp: number;
}

const leadCache = new Map<string, LeadCacheEntry>();
const CACHE_TTL = 30000; // 30 seconds

function getCachedLead(leadId: string): LeadCacheEntry | null {
  const entry = leadCache.get(leadId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    leadCache.delete(leadId);
    return null;
  }
  return entry;
}

function setCachedLead(leadId: string, data: Omit<LeadCacheEntry, 'timestamp'>) {
  leadCache.set(leadId, { ...data, timestamp: Date.now() });
}

function cacheBundle(leadId: string, bundle: LeadDetailBundle) {
  setCachedLead(leadId, bundle);
}

// Standalone prefetch function - can be called from lead cards
const prefetchingLeads = new Set<string>();

export async function prefetchLead(leadId: string, companyId: string) {
  if (!companyId || !leadId || prefetchingLeads.has(leadId)) return;

  const cached = getCachedLead(leadId);
  if (cached) {
    console.log('[PERF] Prefetch: using cached data');
    return;
  }

  if (prefetchingLeads.has(leadId)) return;
  prefetchingLeads.add(leadId);
  console.log('[PERF] Prefetch started for lead:', leadId);

  try {
    const { data: bundle, error } = await leadService.getDetailBundle(leadId);

    if (error || !bundle) {
      console.log('[PERF] Prefetch failed:', error?.message);
      return;
    }

    cacheBundle(leadId, bundle);
    console.log('[PERF] Prefetch completed and cached');
  } catch (e) {
    console.log('[PERF] Prefetch error:', e);
  } finally {
    prefetchingLeads.delete(leadId);
  }
}

type UseLeadOptions = {
  loadCompanyUsers?: boolean;
};

export function useLead(
  leadId: string,
  { loadCompanyUsers = true }: UseLeadOptions = {},
) {
  const user = useUser();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [followups, setFollowups] = useState<LeadFollowup[]>([]);
  const [siteVisits, setSiteVisits] = useState<LeadSiteVisit[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<LeadStatusUpdate[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const companyId = user?.company_id;

  useEffect(() => {
    if (!companyId || !leadId) {
      return;
    }

    let cancelled = false;

    async function loadLead() {
      const startedAt = performance.now();
      let outcome = "failed";
      console.log('[PERF] loadLead started');
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first
        const cached = getCachedLead(leadId);
        if (cached) {
          outcome = "cache-hit";
          console.log('[PERF] Using cached lead data');
          setLead(cached.lead);
          setNotes(cached.notes);
          setFollowups(cached.followups);
          setSiteVisits(cached.siteVisits);
          setStatusUpdates(cached.statusUpdates);
          setIsLoading(false);
          console.log('[PERF] Cached data applied instantly');
          return;
        }

        const { data: bundle, error: fetchError } =
          await leadService.getDetailBundle(leadId);

        outcome = cancelled ? "cancelled" : "completed";
        console.log('[PERF] Lead fetch completed');

        if (cancelled) return;

        if (fetchError || !bundle) {
          outcome = "error";
          setError(fetchError?.message ?? "Lead not found");
          setIsLoading(false);
          return;
        }

        cacheBundle(leadId, bundle);
        setLead(bundle.lead);
        setNotes(bundle.notes);
        setFollowups(bundle.followups);
        setSiteVisits(bundle.siteVisits);
        setStatusUpdates(bundle.statusUpdates);
        setIsLoading(false);
        console.log('[PERF] State updated, render should trigger');
      } finally {
        const duration = performance.now() - startedAt;
        console.log(
          `[PERF] LEAD_FETCH_${leadId}: ${duration.toFixed(2)}ms (${outcome})`,
        );
      }
    }

    void loadLead();

    return () => {
      cancelled = true;
    };
  }, [companyId, leadId, refreshKey]);

  useEffect(() => {
    if (!companyId || !user || !loadCompanyUsers) return;

    void userService.getByCompany(companyId).then((usersResult) => {
      if (usersResult.data) {
        setCompanyUsers(
          filterCompanyUsersForScope(
            user,
            usersResult.data as CompanyUser[],
            "assign",
          ),
        );
      }
    });
  }, [companyId, loadCompanyUsers, user]);

  useEffect(() => {
    if (!companyId) return;

    void projectService.getByCompany(companyId).then((projectsResult) => {
      if (projectsResult.data) {
        setProjects(projectsResult.data as Project[]);
      }
    });
  }, [companyId]);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return {
    lead,
    notes,
    followups,
    siteVisits,
    statusUpdates,
    companyUsers,
    projects,
    isLoading,
    error,
    refresh,
  };
}
