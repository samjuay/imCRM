"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LeadPermissionGate } from "@/features/leads/components/lead-permission-gate";
import { useActivities } from "@/hooks/use-activities";
import { ActivitiesDashboard } from "@/features/activities/components/activities-dashboard";
import { ActivitiesCardDetail } from "@/features/activities/components/activities-card-detail";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityCardId, ActivityFilters } from "@/types";

const VALID_CARD_IDS: Set<string> = new Set([
  "overdue-followups",
  "followups-today",
  "leads-without-followup",
  "site-visits-today",
  "upcoming-followups",
  "upcoming-site-visits",
]);

function ActivitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardParam = searchParams.get("card");
  const activeCard =
    cardParam && VALID_CARD_IDS.has(cardParam)
      ? (cardParam as ActivityCardId)
      : null;

  const {
    companyUsers,
    leadSources,
    leadStatuses,
    refresh,
    isCountsLoading,
    isDetailLoading,
    error,
    counts,
    detailData,
    loadDetail,
    clearDetail,
    updateFilters,
  } = useActivities();

  // Track if we're navigating to a lead detail (to avoid clearing on focus)
  const isNavigatingToLead = useRef(false);
  
  // Use URL-based filter persistence for Leads Without Next Action
  const [localFilters, setLocalFilters] = useState<ActivityFilters>(() => {
    if (typeof window !== "undefined" && activeCard === "leads-without-followup") {
      const params = new URLSearchParams(window.location.search);
      return {
        search: params.get("search") || undefined,
        assigned_user_id: params.get("assigned_user_id") || undefined,
        status_id: params.get("status_id") || undefined,
        lead_source_id: params.get("lead_source_id") || undefined,
      };
    }
    return {};
  });

  // Sync local filters to URL and global filters
  useEffect(() => {
    if (activeCard !== "leads-without-followup") return;

    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    Object.entries(localFilters).forEach(([key, value]) => {
      if (value && typeof value === "string") {
        params.set(key, value);
        changed = true;
      } else {
        params.delete(key);
        changed = true;
      }
    });

    if (changed) {
      const newUrl = `/activities?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }

    // Also sync to global filters for loadDetail
    updateFilters(localFilters);
  }, [localFilters, activeCard, router, searchParams, updateFilters]);

  // Initialize local filters from URL on mount
  useEffect(() => {
    if (activeCard === "leads-without-followup") {
      const params = new URLSearchParams(searchParams.toString());
      const filters: ActivityFilters = {};
      const search = params.get("search");
      const assigned = params.get("assigned_user_id");
      const status = params.get("status_id");
      const source = params.get("lead_source_id");
      if (search) filters.search = search;
      if (assigned) filters.assigned_user_id = assigned;
      if (status) filters.status_id = status;
      if (source) filters.lead_source_id = source;
      setLocalFilters(filters);
    }
  }, [activeCard, searchParams]);

  const handleCardTap = useCallback(
    (cardId: ActivityCardId) => {
      router.push(`/activities?card=${cardId}`);
    },
    [router],
  );

  const handleBack = useCallback(() => {
    clearDetail();
    router.push("/activities");
  }, [clearDetail, router]);

  const handleLeadClick = useCallback(() => {
    isNavigatingToLead.current = true;
    // Reset after navigation completes
    setTimeout(() => { isNavigatingToLead.current = false; }, 100);
  }, []);

  // Single effect to load detail when card becomes active or filters change
  useEffect(() => {
    if (!activeCard) return;
    if (!detailData || detailData.cardId !== activeCard) {
      void loadDetail(activeCard);
    }
  }, [activeCard, detailData?.cardId, loadDetail]);

  // Reload detail when filters change for Leads Without Next Action
  useEffect(() => {
    if (activeCard === "leads-without-followup" && detailData?.cardId === activeCard) {
      void loadDetail(activeCard);
    }
  }, [localFilters, activeCard, detailData?.cardId, loadDetail]);

  // Auto-refresh detail when returning from lead detail (window focus)
  // But ONLY if we're not navigating to a lead
  useEffect(() => {
    if (!activeCard) return;

    const handleFocus = () => {
      // Don't clear if we just navigated to a lead detail
      if (isNavigatingToLead.current) {
        isNavigatingToLead.current = false;
        return;
      }
      // Only clear if we have detail data for the active card
      if (detailData?.cardId === activeCard) {
        clearDetail();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeCard, clearDetail, detailData?.cardId]);

  // Only pass filters to Leads Without Next Action detail
  const isLeadsWithoutNextAction = activeCard === "leads-without-followup";

  return (
    <LeadPermissionGate action="view">
      {activeCard ? (
        <ActivitiesCardDetail
          cardId={activeCard}
          items={detailData?.cardId === activeCard ? detailData.items : []}
          leads={detailData?.cardId === activeCard ? detailData.leads : []}
          isLoading={isDetailLoading}
          onBack={handleBack}
          onLeadClick={handleLeadClick}
          isLeadsWithoutNextAction={isLeadsWithoutNextAction}
          localFilters={localFilters}
          setLocalFilters={setLocalFilters}
          leadStatuses={leadStatuses}
          leadSources={leadSources}
          companyUsers={companyUsers}
        />
      ) : (
        <ActivitiesDashboard
          counts={counts}
          companyUsers={companyUsers}
          onCardTap={handleCardTap}
          onRefresh={refresh}
          isLoading={isCountsLoading}
        />
      )}
    </LeadPermissionGate>
  );
}

function ActivitiesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse bg-muted rounded" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<ActivitiesSkeleton />}>
      <ActivitiesContent />
    </Suspense>
  );
}