"use client";

import { Plus, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { useMasterData } from "@/hooks/use-master-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadSourceList } from "@/features/settings/components/lead-source-list";
import { LeadSourceForm } from "@/features/settings/components/lead-source-form";
import { LeadSourceArchiveModal } from "@/features/settings/components/lead-source-archive-modal";
import { useMasterDataStore } from "@/store/master-data-store";
import { leadSourceService } from "@/services/master-data/lead-source.service";
import { SettingsGuard } from "@/components/auth/settings-guard";

function LeadSourcesContent() {
  const user = useUser();
  const { can } = usePermissions();
  const { leadSources, isLoading: sourcesLoading } = useMasterData();
  const { loadByCompany } = useMasterDataStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [archivingSource, setArchivingSource] = useState<any>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  const canManage = can("lead_sources", "create") || can("lead_sources", "edit");

  useEffect(() => {
    if (!user?.company_id) return;
    loadByCompany(user.company_id, true).then(() => {
      // Load all sources including archived for admin view
    });
  }, [user?.company_id, loadByCompany]);

  const handleOpenCreate = () => {
    setEditingSource(null);
    setShowCreateModal(true);
  };

  const handleEdit = (source: any) => {
    setEditingSource(source);
    setShowCreateModal(true);
  };

  const handleArchive = async (source: any) => {
    setArchivingSource(source);
    setIsLoadingUsage(true);
    const count = await leadSourceService.getUsageCount(user?.company_id || "", source.id);
    setUsageCount(count);
    setIsLoadingUsage(false);
  };

  const handleArchiveCancel = () => {
    setArchivingSource(null);
    setUsageCount(0);
  };

  const handleArchiveConfirm = async () => {
    if (!archivingSource || !user?.company_id) return;
    await leadSourceService.archive(user.company_id, archivingSource.id);
    setArchivingSource(null);
    loadByCompany(user.company_id, true);
  };

  const handleSubmit = async (data: any, id?: string) => {
    if (!user?.company_id) return;
    if (id) {
      await leadSourceService.update(user.company_id, id, data);
    } else {
      await leadSourceService.create(user.company_id, data);
    }
    setShowCreateModal(false);
    setEditingSource(null);
    loadByCompany(user.company_id, true);
  };

  const handleCancel = () => {
    setShowCreateModal(false);
    setEditingSource(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Lead Sources</h1>
          <p className="text-sm text-muted-foreground">
            Manage your lead sources
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Button variant="gold" size="sm" onClick={handleOpenCreate}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Source</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </div>

      {sourcesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <LeadSourceList
          sources={leadSources}
          onEdit={handleEdit}
          onArchive={handleArchive}
        />
      )}

      <LeadSourceForm
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={editingSource}
      />

      <LeadSourceArchiveModal
        open={!!archivingSource}
        onOpenChange={handleArchiveCancel}
        onConfirm={handleArchiveConfirm}
        source={archivingSource}
        usageCount={usageCount}
        isLoading={isLoadingUsage}
      />
    </div>
  );
}

export default function LeadSourcesPage() {
  return (
    <SettingsGuard>
      <LeadSourcesContent />
    </SettingsGuard>
  );
}