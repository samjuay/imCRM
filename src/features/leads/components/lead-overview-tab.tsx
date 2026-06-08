"use client";

import { LeadStatusBadge } from "@/features/leads/components/lead-status-badge";
import { LeadPhoneLink } from "@/features/leads/components/lead-phone-link";
import type { LeadDetail } from "@/types/lead";

type LeadOverviewTabProps = {
  lead: LeadDetail;
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LeadOverviewTab({ lead }: LeadOverviewTabProps) {
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
    </div>
  );
}