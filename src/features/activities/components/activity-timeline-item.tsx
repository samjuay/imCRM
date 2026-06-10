"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type {
  ActivityItem,
  FollowupActivityItem,
  LeadAssignedActivityItem,
  SiteVisitActivityItem,
  StatusChangeActivityItem,
} from "@/types/lead";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityTimelineItem({ item }: { item: ActivityItem }) {
  const leadLink = (
    <Link href={`/leads/${item.lead_id}`} className="font-medium text-primary hover:underline">
      {item.lead_full_name ?? "Lead"}
    </Link>
  );

  const meta = (
    <p className="mt-1 text-xs text-muted-foreground">
      {item.assigned_user_name ?? "Unassigned"} · {formatDateTime(item.occurred_at)}
    </p>
  );

  if (item.type === "lead_created") {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Lead Created</span>
          <Badge variant="outline">New</Badge>
          {leadLink}
        </div>
        {item.status_name && (
          <div className="mt-1 text-sm text-muted-foreground">Initial status: {item.status_name}</div>
        )}
        {meta}
      </div>
    );
  }

  if (item.type === "status_changed" || item.type === "booking_completed") {
    const isBooking = item.type === "booking_completed";
    const sItem = item as StatusChangeActivityItem;
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {sItem.previous_status && (
            <>
              <span className="text-sm">{sItem.previous_status}</span>
              <span>→</span>
            </>
          )}
          <span className="font-medium text-sm">{sItem.new_status}</span>
          {sItem.outcome && <Badge variant="outline">{sItem.outcome}</Badge>}
          {isBooking && <Badge variant="gold">Booked</Badge>}
          {leadLink}
        </div>
        {sItem.remark && <p className="mt-1 text-sm whitespace-pre-wrap">{sItem.remark}</p>}
        {(sItem.next_followup_date || sItem.project_name) && (
          <div className="mt-1 text-xs text-muted-foreground">
            {sItem.next_followup_date && `Next: ${formatDateTime(sItem.next_followup_date)} `}
            {sItem.project_name}
          </div>
        )}
        {meta}
      </div>
    );
  }

  if (item.type === "followup_created") {
    const fItem = item as FollowupActivityItem;
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Follow-up Created</span>
          {fItem.followup_type_name && <Badge variant="outline">{fItem.followup_type_name}</Badge>}
          {leadLink}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(fItem.followup_date)}</p>
        {fItem.remarks && <p className="mt-1 text-xs line-clamp-2">{fItem.remarks}</p>}
        {meta}
      </div>
    );
  }

  if (item.type === "site_visit_created" || item.type === "site_visit_completed") {
    const isCompleted = item.type === "site_visit_completed";
    const vItem = item as SiteVisitActivityItem;
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{isCompleted ? "Site Visit Completed" : "Site Visit Created"}</span>
          {vItem.project_name && <Badge variant="outline">{vItem.project_name}</Badge>}
          <Badge variant={isCompleted ? "default" : "outline"}>{vItem.visit_status}</Badge>
          {leadLink}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(vItem.visit_date)}</p>
        {vItem.remarks && <p className="mt-1 text-xs line-clamp-2">{vItem.remarks}</p>}
        {meta}
      </div>
    );
  }

  if (item.type === "lead_assigned") {
    const aItem = item as LeadAssignedActivityItem;
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Lead Assigned</span>
          <Badge variant="gold">Reassigned</Badge>
          {leadLink}
        </div>
        <div className="mt-1 text-sm">
          From: <span className="font-medium">{aItem.previous_assigned_user_name ?? "Unassigned"}</span>
          {" → "}
          To: <span className="font-medium">{aItem.new_assigned_user_name ?? "Unassigned"}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          By: {aItem.assigned_by_user_name ?? "Unknown"}
        </div>
        {aItem.assignment_reason && (
          <div className="mt-1 text-xs">
            Reason: <span className="italic">{aItem.assignment_reason}</span>
          </div>
        )}
        {meta}
      </div>
    );
  }
}