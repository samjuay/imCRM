"use client";

import { use } from "react";
import { LeadPermissionGate } from "@/features/leads/components/lead-permission-gate";
import { LeadDetail } from "@/features/leads/components/lead-detail";

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = use(params);

  return (
    <LeadPermissionGate action="view">
      <LeadDetail leadId={id} />
    </LeadPermissionGate>
  );
}