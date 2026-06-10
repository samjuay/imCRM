"use client";

import Link from "next/link";
import { Edit, MessageCircle, Phone } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { getTelLink, getWhatsAppLink } from "@/utils/phone";
import type { LeadDetail } from "@/types/lead";

type LeadQuickActionsProps = {
  lead: LeadDetail;
};

export function LeadQuickActions({ lead }: LeadQuickActionsProps) {
  const { can } = usePermissions();
  const canEdit = can("leads", "edit");

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <a href={getTelLink(lead.phone)}>
          <Phone className="size-4" />
          Call
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="shrink-0">
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
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/leads/${lead.id}/edit`}>
            <Edit className="size-4" />
            Edit
          </Link>
        </Button>
      )}
    </div>
  );
}
