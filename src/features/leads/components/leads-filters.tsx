"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useMasterData } from "@/hooks/use-master-data";
import type { CompanyUser, LeadFilters } from "@/types/lead";

type LeadsFiltersProps = {
  filters: LeadFilters;
  companyUsers: CompanyUser[];
  onChange: (filters: LeadFilters) => void;
};

export function LeadsFilters({
  filters,
  companyUsers,
  onChange,
}: LeadsFiltersProps) {
  const { leadSources, leadStatuses } = useMasterData();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="filter-status">Status</Label>
        <Select
          id="filter-status"
          value={filters.status_id ?? ""}
          onChange={(e) =>
            onChange({ ...filters, status_id: e.target.value || undefined })
          }
        >
          <option value="">All statuses</option>
          {leadStatuses
            .filter((s) => s.is_active)
            .map((status) => (
              <option key={status.id} value={status.id}>
                {status.status_name}
              </option>
            ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-source">Source</Label>
        <Select
          id="filter-source"
          value={filters.lead_source_id ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              lead_source_id: e.target.value || undefined,
            })
          }
        >
          <option value="">All sources</option>
          {leadSources
            .filter((s) => s.is_active)
            .map((source) => (
              <option key={source.id} value={source.id}>
                {source.source_name}
              </option>
            ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-assigned">Assigned To</Label>
        <Select
          id="filter-assigned"
          value={filters.assigned_user_id ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              assigned_user_id: e.target.value || undefined,
            })
          }
        >
          <option value="">All users</option>
          {companyUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}