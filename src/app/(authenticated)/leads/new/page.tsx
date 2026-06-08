"use client";

import { LeadPermissionGate } from "@/features/leads/components/lead-permission-gate";
import { LeadCreatePage } from "@/features/leads/components/lead-create-page";

export default function NewLeadPage() {
  return (
    <LeadPermissionGate action="create">
      <LeadCreatePage />
    </LeadPermissionGate>
  );
}