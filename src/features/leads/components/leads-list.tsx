"use client";

import Link from "next/link";
import { Plus, Search, Upload } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useLeads } from "@/hooks/use-leads";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadsCardList } from "@/features/leads/components/leads-card-list";
import { LeadEmptyState } from "@/features/leads/components/lead-empty-state";
import { LeadErrorState } from "@/features/leads/components/lead-error-state";
import { LeadsFilters } from "@/features/leads/components/leads-filters";
import { LeadsPagination } from "@/features/leads/components/leads-pagination";
import { LeadsTable } from "@/features/leads/components/leads-table";
import { leadService } from "@/services/leads";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { CompanyUser } from "@/types/lead";
import { LeadCsvExportButton } from "@/features/leads/components/lead-csv-export-button";
import { LeadCsvImportModal } from "@/features/leads/components/lead-csv-import-modal";

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

  // Sprint 3B bulk: current-page selection only (no cross-page, no select-all-filtered)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Sprint 4A CSV
  const [showImportModal, setShowImportModal] = useState(false);

  const user = useUser();
  const canCreate = can("leads", "create");
  const canEdit = can("leads", "edit");
  // Sales Executive must NOT have CSV import/export access per business rules
  const canImport = canCreate && user?.role !== "sales_executive";
  const selectedCount = selectedIds.size;

  const isSalesExecutive = user?.role === "sales_executive";
  const canAssignLeads = canEdit && !isSalesExecutive;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const openAssignModal = () => {
    if (selectedCount === 0 || !canEdit) return;
    setAssignUserId("");
    setAssignReason("");
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignUserId("");
    setAssignReason("");
  };

  const handleBulkAssign = async () => {
    if (selectedCount === 0 || !assignUserId || !user?.company_id || !user.user_id) return;
    setIsAssigning(true);
    const ids = Array.from(selectedIds);
    const { success, error: bulkErr, assignedCount } = await leadService.bulkAssignLeads(
      user.company_id,
      ids,
      assignUserId,
      user.user_id,
      assignReason || null
    );
    setIsAssigning(false);
    if (!success) {
      toast.error(bulkErr?.message || "Bulk assignment failed");
      return;
    }
    toast.success(`${assignedCount} leads assigned successfully`);
    clearSelection();
    closeAssignModal();
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Manage your sales pipeline
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Sprint 4A: Export CSV (visible when user can view leads; 3C scope applied inside service) */}
          <LeadCsvExportButton />

          {/* Sprint 4A: Import CSV */}
          {canImport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              id="lead-import-csv-btn"
            >
              <Upload className="size-4" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
          )}

          {canCreate && (
            <Button asChild variant="gold" size="sm">
              <Link href="/leads/new">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New Lead</span>
                <span className="sm:hidden">New</span>
              </Link>
            </Button>
          )}
          {canAssignLeads && selectedCount > 0 && (
            <Button variant="outline" size="sm" onClick={openAssignModal}>
              Assign Selected ({selectedCount})
            </Button>
          )}
        </div>
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
          <LeadsTable
            leads={leads}
            selectedIds={canAssignLeads ? selectedIds : undefined}
            onToggleSelect={canAssignLeads ? toggleSelect : undefined}
          />
          <LeadsCardList
            leads={leads}
            selectedIds={canAssignLeads ? Array.from(selectedIds) : undefined}
            onToggleSelect={canAssignLeads ? toggleSelect : undefined}
          />
          <LeadsPagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Sprint 3B bulk assign modal (simple current-page only) */}
      {canAssignLeads && (
        <Modal open={showAssignModal} onOpenChange={closeAssignModal}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Assign Selected Leads ({selectedCount})</h3>
          <div className="space-y-2">
            <Label htmlFor="bulk-assign-user">Assign To</Label>
            <Select
              id="bulk-assign-user"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            >
              <option value="">Select user</option>
              {companyUsers.map((u: CompanyUser) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-assign-reason">Assignment Reason (optional, max 500 chars)</Label>
            <Textarea
              id="bulk-assign-reason"
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Round robin distribution, Employee resigned"
              maxLength={500}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={closeAssignModal} disabled={isAssigning}>
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={handleBulkAssign}
              disabled={!assignUserId || isAssigning}
            >
              {isAssigning ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </div>
        </div>
      </Modal>
      )}

      {/* Sprint 4A: CSV Import Modal */}
      {canImport && (
        <LeadCsvImportModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          onImported={() => {
            setShowImportModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}