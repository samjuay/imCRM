"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ActivityFilters, CompanyUser } from "@/types/lead";

type ActivitiesFiltersProps = {
  filters: ActivityFilters;
  companyUsers: CompanyUser[];
  onChange: (filters: ActivityFilters) => void;
};

export function ActivitiesFilters({
  filters,
  companyUsers,
  onChange,
}: ActivitiesFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px] flex-1 space-y-1.5">
        <Label htmlFor="activity-search">Search leads</Label>
        <Input
          id="activity-search"
          placeholder="Lead name or phone..."
          value={filters.search ?? ""}
          onChange={(e) =>
            onChange({ ...filters, search: e.target.value || undefined })
          }
        />
      </div>

      <div className="min-w-[160px] space-y-1.5">
        <Label htmlFor="activity-assigned">Assigned To</Label>
        <Select
          id="activity-assigned"
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

      <button
        type="button"
        onClick={() => onChange({})}
        className="h-9 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
      >
        Clear
      </button>
    </div>
  );
}
