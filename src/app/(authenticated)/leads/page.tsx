"use client";

import { LeadPermissionGate } from "@/features/leads/components/lead-permission-gate";
import { LeadsList } from "@/features/leads/components/leads-list";

export default function LeadsPage() {
  return (
    <LeadPermissionGate action="view">
      <LeadsList />
    </LeadPermissionGate>
  );
}