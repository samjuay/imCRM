"use client";

import Link from "next/link";
import { Calendar, Edit, MessageCircle, Phone } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useMasterData } from "@/hooks/use-master-data";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getTelLink, getWhatsAppLink } from "@/utils/phone";
import type { LeadDetail } from "@/types/lead";

type LeadQuickActionsProps = {
  lead: LeadDetail;
  onStatusChange: (statusId: string) => void;
  onTabChange: (tab: "followups" | "site-visits") => void;
};

export function LeadQuickActions({
  lead,
  onStatusChange,
  onTabChange,
}: LeadQuickActionsProps) {
  const { can } = usePermissions();
  const { leadStatuses } = useMasterData();
  const canEdit = can("leads", "edit");

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="quick-status" className="text-xs">
            Quick Status Update
          </Label>
          <Select
            id="quick-status"
            value={lead.status_id}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full sm:max-w-xs"
          >
            {leadStatuses
              .filter((s) => s.is_active)
              .map((status) => (
                <option key={status.id} value={status.id}>
                  {status.status_name}
                </option>
              ))}
          </Select>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
        <Button asChild variant="outline" size="sm" className="shrink-0 snap-start">
          <a href={getTelLink(lead.phone)}>
            <Phone className="size-4" />
            Call
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="shrink-0 snap-start">
          <a
            href={getWhatsAppLink(lead.phone)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        </Button>
        {canEdit && (
          <Button asChild variant="outline" size="sm" className="shrink-0 snap-start">
            <Link href={`/leads/${lead.id}/edit`}>
              <Edit className="size-4" />
              Edit
            </Link>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 snap-start"
          onClick={() => onTabChange("followups")}
        >
          <Calendar className="size-4" />
          Followup
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 snap-start"
          onClick={() => onTabChange("site-visits")}
        >
          <Calendar className="size-4" />
          Site Visit
        </Button>
      </div>
    </div>
  );
}