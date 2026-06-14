"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivitiesFilters } from "@/features/activities/components/activities-filters";
import { LeadEmptyState } from "@/features/leads/components/lead-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ActivityCardId,
  ActivityFilters,
  CompanyUser,
  FollowupActivityItem,
  LeadListItem,
  LeadSource,
  LeadStatus,
  SiteVisitActivityItem,
} from "@/types";

const CARD_META: Record<ActivityCardId, { title: string }> = {
  "overdue-followups": { title: "Overdue Followups" },
  "followups-today": { title: "Followup Due Today" },
  "leads-without-followup": { title: "Leads Without Next Action" },
  "site-visits-today": { title: "Site Visits Today" },
  "upcoming-followups": { title: "Upcoming Followups" },
  "upcoming-site-visits": { title: "Upcoming Site Visits" },
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

function FollowupRow({ item, onLeadClick }: { item: FollowupActivityItem; onLeadClick: () => void }) {
  const router = useRouter();
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      onClick={() => { onLeadClick(); router.push(`/leads/${item.lead_id}`); }}
      className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/30"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-primary">
            {item.lead_full_name ?? "Lead"}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.followup_type_name}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {item.status}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDateTime(item.followup_date)}
      </p>
      {item.remarks && (
        <p className="mt-1 text-xs line-clamp-2">{item.remarks}</p>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">
        {item.assigned_user_name ?? "Unassigned"}
      </p>
    </motion.div>
  );
}

function SiteVisitRow({ item, onLeadClick }: { item: SiteVisitActivityItem; onLeadClick: () => void }) {
  const router = useRouter();
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      onClick={() => { onLeadClick(); router.push(`/leads/${item.lead_id}`); }}
      className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/30"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-primary">
            {item.lead_full_name ?? "Lead"}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.project_name ?? "No project"}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {item.visit_status}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDateTime(item.visit_date)}
      </p>
      {item.remarks && (
        <p className="mt-1 text-xs line-clamp-2">{item.remarks}</p>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">
        {item.assigned_user_name ?? "Unassigned"}
      </p>
    </motion.div>
  );
}

function LeadRow({ lead, onLeadClick }: { lead: LeadListItem; onLeadClick: () => void }) {
  const router = useRouter();
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      onClick={() => { onLeadClick(); router.push(`/leads/${lead.id}`); }}
      className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/30"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-primary">{lead.full_name}</p>
          <p className="text-xs text-muted-foreground">{lead.phone}</p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {lead.status_name}
        </Badge>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        {lead.assigned_user_name ?? "Unassigned"}
      </p>
    </motion.div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

type ActivitiesCardDetailProps = {
  cardId: ActivityCardId;
  items: (FollowupActivityItem | SiteVisitActivityItem)[];
  leads: LeadListItem[];
  isLoading: boolean;
  onBack: () => void;
  onLeadClick: () => void;
  isLeadsWithoutNextAction: boolean;
  localFilters: ActivityFilters;
  setLocalFilters: (filters: ActivityFilters) => void;
  leadStatuses: LeadStatus[];
  leadSources: LeadSource[];
  companyUsers: CompanyUser[];
};

export function ActivitiesCardDetail({
  cardId,
  items,
  leads,
  isLoading,
  onBack,
  onLeadClick,
  isLeadsWithoutNextAction,
  localFilters,
  setLocalFilters,
  leadStatuses,
  leadSources,
  companyUsers,
}: ActivitiesCardDetailProps) {
  const meta = CARD_META[cardId];
  const count = cardId === "leads-without-followup" ? leads.length : items.length;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--bottom-nav-height)-2rem)]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-primary md:text-2xl truncate">
            {meta.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {count} {count === 1 ? "lead" : "leads"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-4 px-4">
        {isLeadsWithoutNextAction && (
          <ActivitiesFilters
            filters={localFilters}
            companyUsers={companyUsers}
            leadSources={leadSources}
            leadStatuses={leadStatuses}
            onChange={setLocalFilters}
          />
        )}

        {isLoading ? (
          <DetailSkeleton />
        ) : cardId === "leads-without-followup" ? (
          leads.length === 0 ? (
            <LeadEmptyState
              title="No leads without next action"
              description="All active leads have followups scheduled."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} onLeadClick={onLeadClick} />
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <LeadEmptyState
            title="No items"
            description="Nothing to show for this category."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) =>
              "visit_status" in item ? (
                <SiteVisitRow key={item.id} item={item as SiteVisitActivityItem} onLeadClick={onLeadClick} />
              ) : (
                <FollowupRow key={item.id} item={item as FollowupActivityItem} onLeadClick={onLeadClick} />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
