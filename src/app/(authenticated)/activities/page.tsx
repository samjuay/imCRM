"use client";

import { LeadPermissionGate } from "@/features/leads/components/lead-permission-gate";
import { useActivities } from "@/hooks/use-activities";
import { ActivitiesDashboard } from "@/features/activities/components/activities-dashboard";

export default function ActivitiesPage() {
  const {
    followupsDueToday,
    overdueFollowups,
    siteVisitsToday,
    upcomingFollowups,
    upcomingSiteVisits,
    recentTimeline,
    companyUsers,
    filters,
    updateFilters,
    refresh,
    isLoading,
    counts,
  } = useActivities();

  return (
    <LeadPermissionGate action="view">
      <ActivitiesDashboard
        followupsDueToday={followupsDueToday}
        overdueFollowups={overdueFollowups}
        siteVisitsToday={siteVisitsToday}
        upcomingFollowups={upcomingFollowups}
        upcomingSiteVisits={upcomingSiteVisits}
        recentTimeline={recentTimeline}
        companyUsers={companyUsers}
        filters={filters}
        onFiltersChange={updateFilters}
        onRefresh={refresh}
        isLoading={isLoading}
        counts={counts}
      />
    </LeadPermissionGate>
  );
}