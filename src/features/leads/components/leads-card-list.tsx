"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { LeadPhoneLink } from "@/features/leads/components/lead-phone-link";
import { LeadStatusBadge } from "@/features/leads/components/lead-status-badge";
import { prefetchLead } from "@/hooks/use-lead";
import { useUser } from "@/hooks/use-user";
import type { LeadListItem } from "@/types/lead";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type LeadsCardListProps = {
  leads: LeadListItem[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
};

export function LeadsCardList({ leads, selectedIds = [], onToggleSelect }: LeadsCardListProps) {
  const router = useRouter();
  const user = useUser();
  const companyId = user?.company_id;

  const handlePrefetch = (leadId: string) => {
    if (companyId) {
      void prefetchLead(leadId, companyId);
    }
  };

  return (
    <div className="space-y-3 md:hidden">
      {leads.map((lead) => (
        <motion.div
          key={lead.id}
          role="button"
          tabIndex={0}
          onClick={() => router.push(`/leads/${lead.id}`)}
          onTouchStart={() => handlePrefetch(lead.id)}
          onPointerDown={() => handlePrefetch(lead.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/leads/${lead.id}`);
            }
          }}
          whileHover={{ y: -2, transition: { duration: 0.12 } }}
          whileTap={{ scale: 0.99, transition: { duration: 0.1 } }}
          className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
        >
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selectedIds.includes(lead.id)}
              onChange={() => onToggleSelect(lead.id)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="mr-3 h-4 w-4 accent-gold"
            />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-primary">{lead.full_name}</p>
              <LeadStatusBadge statusName={lead.status_name} />
            </div>
            <div
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Phone className="size-3.5 shrink-0" />
              <LeadPhoneLink
                phone={lead.phone}
                className="text-sm text-muted-foreground hover:underline"
              />
            </div>
            <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span>{lead.source_name}</span>
              <span>{lead.assigned_user_name ?? "Unassigned"}</span>
              <span>{formatDate(lead.created_at)}</span>
            </div>
          </div>
          <ChevronRight className="ml-2 size-5 shrink-0 text-muted-foreground" />
        </motion.div>
      ))}
    </div>
  );
}