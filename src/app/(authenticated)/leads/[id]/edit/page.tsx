"use client";

import { use } from "react";
import { LeadPermissionGate } from "@/features/leads/components/lead-permission-gate";
import { LeadEditPage } from "@/features/leads/components/lead-edit-page";

type LeadEditRouteProps = {
  params: Promise<{ id: string }>;
};

export default function LeadEditRoute({ params }: LeadEditRouteProps) {
  const { id } = use(params);

  return (
    <LeadPermissionGate action="edit">
      <LeadEditPage leadId={id} />
    </LeadPermissionGate>
  );
}