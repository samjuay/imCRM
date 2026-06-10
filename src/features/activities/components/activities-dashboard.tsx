"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadEmptyState } from "@/features/leads/components/lead-empty-state";
import { ActivitiesFilters } from "@/features/activities/components/activities-filters";
import { ActivityTimelineItem } from "@/features/activities/components/activity-timeline-item";
import type {
  ActivityItem,
  CompanyUser,
  FollowupActivityItem,
  SiteVisitActivityItem,
} from "@/types/lead";

type ActivitiesDashboardProps = {
  followupsDueToday: FollowupActivityItem[];
  overdueFollowups: FollowupActivityItem[];
  siteVisitsToday: SiteVisitActivityItem[];
  upcomingFollowups: FollowupActivityItem[];
  upcomingSiteVisits: SiteVisitActivityItem[];
  recentTimeline: ActivityItem[];
  companyUsers: CompanyUser[];
  filters: any;
  onFiltersChange: (f: any) => void;
  onRefresh: () => void;
  isLoading: boolean;
  counts: Record<string, number>;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FollowupCard({ item }: { item: FollowupActivityItem }) {
  const router = useRouter();
  return (
    <div
      className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/30"
      onClick={() => router.push(`/leads/${item.lead_id}`)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-primary">{item.lead_full_name ?? "Lead"}</p>
          <p className="text-xs text-muted-foreground">{item.followup_type_name}</p>
        </div>
        <Badge variant="outline" className="shrink-0">{item.status}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(item.followup_date)}</p>
      {item.remarks && <p className="mt-1 text-xs line-clamp-2">{item.remarks}</p>}
      <p className="mt-2 text-[10px] text-muted-foreground">
        {item.assigned_user_name ?? "Unassigned"}
      </p>
    </div>
  );
}

function SiteVisitCard({ item }: { item: SiteVisitActivityItem }) {
  const router = useRouter();
  const isDone = item.type === "site_visit_completed";
  return (
    <div
      className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/30"
      onClick={() => router.push(`/leads/${item.lead_id}`)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-primary">{item.lead_full_name ?? "Lead"}</p>
          <p className="text-xs text-muted-foreground">{item.project_name ?? "No project"}</p>
        </div>
        <Badge variant={isDone ? "default" : "outline"} className="shrink-0">
          {item.visit_status}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(item.visit_date)}</p>
      {item.remarks && <p className="mt-1 text-xs line-clamp-2">{item.remarks}</p>}
      <p className="mt-2 text-[10px] text-muted-foreground">
        {item.assigned_user_name ?? "Unassigned"}
      </p>
    </div>
  );
}

export function ActivitiesDashboard({
  followupsDueToday,
  overdueFollowups,
  siteVisitsToday,
  upcomingFollowups,
  upcomingSiteVisits,
  recentTimeline,
  companyUsers,
  filters,
  onFiltersChange,
  onRefresh,
  isLoading,
  counts,
}: ActivitiesDashboardProps) {
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const visibleTimeline = showAllTimeline ? recentTimeline : recentTimeline.slice(0, 12);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse bg-muted rounded" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Activities</h1>
          <p className="text-sm text-muted-foreground">What do I need to do today?</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <ActivitiesFilters
          filters={filters}
          companyUsers={companyUsers}
          onChange={onFiltersChange}
        />
      </div>

      {/* A. Followups Due Today */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Followups Due Today</h2>
          <Badge variant="gold">{counts.dueToday}</Badge>
        </div>
        {followupsDueToday.length === 0 ? (
          <LeadEmptyState title="No followups due today" description="Great — nothing scheduled for today." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {followupsDueToday.map((item) => (
              <FollowupCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* B. Overdue Followups */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-destructive">Overdue Followups</h2>
          <Badge variant="destructive">{counts.overdue}</Badge>
        </div>
        {overdueFollowups.length === 0 ? (
          <LeadEmptyState title="No overdue followups" description="All caught up." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overdueFollowups.map((item) => (
              <FollowupCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* C. Site Visits Today */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Site Visits Today</h2>
          <Badge variant="gold">{counts.visitsToday}</Badge>
        </div>
        {siteVisitsToday.length === 0 ? (
          <LeadEmptyState title="No site visits today" description="No visits scheduled for today." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {siteVisitsToday.map((item) => (
              <SiteVisitCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* D + E Upcoming (lower priority) */}
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-base font-semibold">Upcoming Followups</h2>
            <Badge variant="outline">{counts.upcomingFollowups}</Badge>
          </div>
          {upcomingFollowups.length === 0 ? (
            <LeadEmptyState title="No upcoming followups" description="" />
          ) : (
            <div className="space-y-2">
              {upcomingFollowups.slice(0, 6).map((item) => (
                <FollowupCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-base font-semibold">Upcoming Site Visits</h2>
            <Badge variant="outline">{counts.upcomingSiteVisits}</Badge>
          </div>
          {upcomingSiteVisits.length === 0 ? (
            <LeadEmptyState title="No upcoming site visits" description="" />
          ) : (
            <div className="space-y-2">
              {upcomingSiteVisits.slice(0, 6).map((item) => (
                <SiteVisitCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* F. Recent Activity Timeline */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Recent Activity Timeline</h2>
            <Badge variant="outline">{counts.timeline}</Badge>
          </div>
          {recentTimeline.length > 12 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllTimeline(!showAllTimeline)}
            >
              {showAllTimeline ? "Show less" : "Show all"}
            </Button>
          )}
        </div>

        {recentTimeline.length === 0 ? (
          <LeadEmptyState
            title="No recent activity"
            description="Activity from leads (creations, status changes, followups, site visits) will appear here."
          />
        ) : (
          <div className="space-y-2">
            {visibleTimeline.map((item) => (
              <ActivityTimelineItem key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
