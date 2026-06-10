import Link from "next/link";
import { LeadPhoneLink } from "@/features/leads/components/lead-phone-link";
import { LeadStatusBadge } from "@/features/leads/components/lead-status-badge";
import type { LeadListItem } from "@/types/lead";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type LeadsTableProps = {
  leads: LeadListItem[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
};

export function LeadsTable({ leads, selectedIds, onToggleSelect }: LeadsTableProps) {
  const showSelection = selectedIds !== undefined && onToggleSelect !== undefined;
  const effectiveSelected = selectedIds ?? new Set<string>();
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            {showSelection && (
              <th className="px-4 py-3 font-medium text-muted-foreground w-8">
                {/* Sprint 3B: current page bulk selection only */}
              </th>
            )}
            <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Source</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Assigned To</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="border-b border-border last:border-0 hover:bg-muted/20"
            >
              {showSelection && (
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={effectiveSelected.has(lead.id)}
                    onChange={() => onToggleSelect?.(lead.id)}
                    className="h-4 w-4"
                  />
                </td>
              )}
              <td className="px-4 py-3">
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {lead.full_name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <LeadPhoneLink
                  phone={lead.phone}
                  className="text-muted-foreground hover:underline"
                />
              </td>
              <td className="px-4 py-3">{lead.source_name}</td>
              <td className="px-4 py-3">
                <LeadStatusBadge statusName={lead.status_name} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {lead.assigned_user_name ?? "Unassigned"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(lead.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}