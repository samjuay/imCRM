"use client";

import { Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { useProjectStore } from "@/store/project-store";
import { projectService } from "@/services/projects/project.service";
import type { Project } from "@/types/project";
import { ProjectsTable } from "@/features/projects/components/projects-table";
import { ProjectsCardList } from "@/features/projects/components/projects-card-list";
import { ProjectForm } from "@/features/projects/components/project-form";
import { ProjectManageModal } from "@/features/projects/components/project-manage-modal";
import { ProjectCsvExportButton } from "@/features/projects/components/project-csv-export-button";
import { ProjectCsvImportModal } from "@/features/projects/components/project-csv-import-modal";

export default function ProjectsPage() {
  const user = useUser();
  const { can } = usePermissions();
  const {
    projects,
    isLoading: isStoreLoading,
    loadByCompany,
    reset: resetStore,
  } = useProjectStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [manageProject, setManageProject] = useState<Project | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);

  const companyId = user?.company_id;
  const canCreate = can("projects", "create");
  const canEdit = can("projects", "edit");
  const canDelete = can("projects", "delete");
  // Only Company Admin and super_admin can import/export projects
  const canProjectCsv = canCreate && user?.role !== "team_leader" && user?.role !== "sales_executive";

  // Sprint 4A CSV
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    loadByCompany(companyId).finally(() => setIsLoading(false));
  }, [companyId, loadByCompany]);

  const refresh = async () => {
    if (companyId) {
      await loadByCompany(companyId);
    }
  };

  const openCreate = () => {
    if (!canCreate) return;
    setEditingProject(null);
    setShowCreateModal(true);
  };

  const openEdit = (project: Project) => {
    if (!canEdit) return;
    setEditingProject(project);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingProject(null);
  };

  const handleProjectSubmit = async (data: any, id?: string) => {
    if (!companyId) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        possession_date: data.possession_date || null,
        developer_name: data.developer_name || null,
        location: data.location || null,
      };
      if (id) {
        await projectService.update(companyId, id, payload);
        toast.success("Project updated");
      } else {
        await projectService.create(companyId, payload);
        toast.success("Project created");
      }
      await refresh();
      closeCreateModal();
    } catch (e: any) {
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!companyId || !canDelete) return;
    if (!confirm(`Delete project "${project.project_name}"? This cannot be undone.`)) return;
    try {
      await projectService.delete(companyId, project.id);
      toast.success("Project deleted");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete project");
    }
  };

  const openManage = (project: Project) => {
    setManageProject(project);
    setShowManageModal(true);
  };

  const closeManage = () => {
    setShowManageModal(false);
    setManageProject(null);
  };

  const handleProjectUpdatedFromManage = async () => {
    await refresh();
  };

  const loading = isLoading || isStoreLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage real estate projects, configurations and inventory
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Sprint 4A: Export CSV */}
          {canProjectCsv && <ProjectCsvExportButton />}

          {/* Sprint 4A: Import CSV */}
          {canProjectCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              id="project-import-csv-btn"
            >
              <Upload className="size-4" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
          )}

          {canCreate && (
            <Button variant="gold" size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <ProjectsTable
            projects={projects}
            onEdit={openEdit}
            onDelete={handleDelete}
            onManage={openManage}
            canEdit={canEdit}
            canDelete={canDelete}
          />
          <ProjectsCardList
            projects={projects}
            onEdit={openEdit}
            onDelete={handleDelete}
            onManage={openManage}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </>
      )}

      {/* Create / Edit Project Modal */}
      <Modal open={showCreateModal} onOpenChange={closeCreateModal}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {editingProject ? "Edit Project" : "New Project"}
          </h3>
          <ProjectForm
            project={editingProject || undefined}
            onSubmit={handleProjectSubmit}
            onCancel={closeCreateModal}
            isSubmitting={isSubmitting}
          />
        </div>
      </Modal>

      {/* Manage Project Modal (contains details + configs + inventory) */}
      <ProjectManageModal
        open={showManageModal}
        onOpenChange={closeManage}
        project={manageProject}
        onProjectUpdated={handleProjectUpdatedFromManage}
      />

      {/* Sprint 4A: CSV Import Modal */}
      {canProjectCsv && (
        <ProjectCsvImportModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          onImported={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
