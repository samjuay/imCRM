"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useLeads } from "@/hooks/use-leads";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadsCardList } from "@/features/leads/components/leads-card-list";
import { LeadEmptyState } from "@/features/leads/components/lead-empty-state";
import { LeadErrorState } from "@/features/leads/components/lead-error-state";
import { LeadsFilters } from "@/features/leads/components/leads-filters";
import { LeadsPagination } from "@/features/leads/components/leads-pagination";
import { LeadsTable } from "@/features/leads/components/leads-table";

export function LeadsList() {
  const { can } = usePermissions();
  const {
    leads,
    total,
    page,
    totalPages,
    filters,
    companyUsers,
    isLoading,
    error,
    setPage,
    updateFilters,
    refresh,
  } = useLeads();

  const canCreate = can("leads", "create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Manage your sales pipeline
          </p>
        </div>
        {canCreate && (
          <Button asChild variant="gold" size="sm">
            <Link href="/leads/new">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Lead</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-9"
            value={filters.search ?? ""}
            onChange={(e) =>
              updateFilters({ ...filters, search: e.target.value || undefined })
            }
          />
        </div>
        <LeadsFilters
          filters={filters}
          companyUsers={companyUsers}
          onChange={updateFilters}
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <LeadErrorState message={error} onRetry={() => void refresh()} />
      )}

      {!isLoading && !error && leads.length === 0 && <LeadEmptyState />}

      {!isLoading && !error && leads.length > 0 && (
        <>
          <LeadsTable leads={leads} />
          <LeadsCardList leads={leads} />
          <LeadsPagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}