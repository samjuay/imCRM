"use client";

import { LeadStatusBadge } from "@/features/leads/components/lead-status-badge";
import { LeadPhoneLink } from "@/features/leads/components/lead-phone-link";
import type { LeadDetail, LeadSiteVisit, LeadStatusUpdate } from "@/types/lead";
import type { Project } from "@/types/project";

type LeadOverviewTabProps = {
  lead: LeadDetail;
  projects?: Project[];
  siteVisits?: LeadSiteVisit[];
  statusUpdates?: LeadStatusUpdate[];
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LeadOverviewTab({ lead, projects, siteVisits, statusUpdates }: LeadOverviewTabProps) {
  return (
    <div className="space-y-6">
      <LeadStatusBadge statusName={lead.status_name} />

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Phone</dt>
          <dd className="mt-0.5">
            <LeadPhoneLink phone={lead.phone} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Email</dt>
          <dd className="mt-0.5 text-sm">{lead.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Source</dt>
          <dd className="mt-0.5 text-sm">{lead.source_name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Assigned To</dt>
          <dd className="mt-0.5 text-sm">
            {lead.assigned_user_name ?? "Unassigned"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Budget</dt>
          <dd className="mt-0.5 text-sm">{formatCurrency(lead.budget)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Location</dt>
          <dd className="mt-0.5 text-sm">{lead.location ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-muted-foreground">Requirement</dt>
          <dd className="mt-0.5 text-sm">{lead.requirement ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-muted-foreground">Remarks</dt>
          <dd className="mt-0.5 text-sm">{lead.remarks ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Created By</dt>
          <dd className="mt-0.5 text-sm">{lead.created_by_name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Created</dt>
          <dd className="mt-0.5 text-sm">
            {new Date(lead.created_at).toLocaleString("en-IN")}
          </dd>
        </div>
      </dl>

      {/* Linked Projects (read-only, from site visits and status updates) */}
      {(siteVisits && siteVisits.length > 0) || (statusUpdates && statusUpdates.length > 0) ? (
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Linked Projects</dt>
          <dd className="mt-0.5 text-sm">
            {(() => {
              const linkedIds = new Set<string>();
              (siteVisits ?? []).forEach((v) => {
                if (v.project_id) linkedIds.add(v.project_id);
              });
              (statusUpdates ?? []).forEach((u) => {
                if (u.project_id) linkedIds.add(u.project_id);
              });
              if (linkedIds.size === 0) return "—";
              const names = Array.from(linkedIds)
                .map((id) => projects?.find((p) => p.id === id)?.project_name)
                .filter(Boolean) as string[];
              const uniqueNames = Array.from(new Set(names));
              return uniqueNames.length > 0 ? uniqueNames.join(", ") : "—";
            })()}
          </dd>
        </div>
      ) : null}
    </div>
  );
}