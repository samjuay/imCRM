"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { projectConfigurationService } from "@/services/projects/project-configuration.service";
import { projectInventoryService } from "@/services/projects/project-inventory.service";
import { projectService } from "@/services/projects/project.service";
import type {
  Project,
  ProjectConfiguration,
  ProjectInventory,
} from "@/types/project";
import { ProjectForm } from "./project-form";
import { ConfigForm } from "./config-form";
import { InventoryForm } from "./inventory-form";

type ProjectManageModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onProjectUpdated: () => void;
};

export function ProjectManageModal({
  open,
  onOpenChange,
  project,
  onProjectUpdated,
}: ProjectManageModalProps) {
  const user = useUser();
  const { can } = usePermissions();
  const companyId = user?.company_id;

  const canEdit = can("projects", "edit");
  const canDelete = can("projects", "delete");

  const [configs, setConfigs] = useState<ProjectConfiguration[]>([]);
  const [inventories, setInventories] = useState<ProjectInventory[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false);

  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ProjectConfiguration | null>(null);
  const [isConfigSubmitting, setIsConfigSubmitting] = useState(false);

  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [editingInventory, setEditingInventory] = useState<ProjectInventory | null>(null);
  const [isInventorySubmitting, setIsInventorySubmitting] = useState(false);

  const loadSubData = async (projId: string) => {
    if (!companyId) return;
    setIsLoadingSubs(true);
    try {
      const [configsRes, invRes] = await Promise.all([
        projectConfigurationService.getByProject(companyId, projId),
        projectInventoryService.getByProject(companyId, projId),
      ]);
      setConfigs((configsRes.data ?? []) as ProjectConfiguration[]);
      setInventories((invRes.data ?? []) as ProjectInventory[]);
    } catch (e: any) {
      toast.error("Failed to load configurations or inventory");
    } finally {
      setIsLoadingSubs(false);
    }
  };

  useEffect(() => {
    if (open && project && companyId) {
      loadSubData(project.id);
    } else {
      setConfigs([]);
      setInventories([]);
      setShowProjectForm(false);
      setEditingProject(null);
      setShowConfigForm(false);
      setEditingConfig(null);
      setShowInventoryForm(false);
      setEditingInventory(null);
    }
  }, [open, project, companyId]);

  const closeAllSubForms = () => {
    setShowProjectForm(false);
    setEditingProject(null);
    setShowConfigForm(false);
    setEditingConfig(null);
    setShowInventoryForm(false);
    setEditingInventory(null);
  };

  // Project details
  const handleEditProject = () => {
    if (!project || !canEdit) return;
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleProjectSubmit = async (data: any, id?: string) => {
    if (!companyId || !project) return;
    setIsProjectSubmitting(true);
    try {
      if (id) {
        await projectService.update(companyId, id, data);
        toast.success("Project updated");
      } else {
        // not used here
      }
      onProjectUpdated();
      setShowProjectForm(false);
      setEditingProject(null);
    } catch (e: any) {
      throw e;
    } finally {
      setIsProjectSubmitting(false);
    }
  };

  // Configurations
  const openAddConfig = () => {
    if (!project || !canEdit) return;
    setEditingConfig(null);
    setShowConfigForm(true);
  };

  const openEditConfig = (config: ProjectConfiguration) => {
    if (!canEdit) return;
    setEditingConfig(config);
    setShowConfigForm(true);
  };

  const handleConfigSubmit = async (data: any, id?: string) => {
    if (!companyId || !project) return;
    setIsConfigSubmitting(true);
    try {
      const payload = {
        ...data,
        project_id: project.id,
        carpet_area: data.carpet_area ? parseFloat(data.carpet_area) : null,
        saleable_area: data.saleable_area ? parseFloat(data.saleable_area) : null,
        starting_price: data.starting_price ? parseFloat(data.starting_price) : null,
      };
      if (id) {
        await projectConfigurationService.update(companyId, id, payload);
        toast.success("Configuration updated");
      } else {
        await projectConfigurationService.create(companyId, payload);
        toast.success("Configuration added");
      }
      await loadSubData(project.id);
      setShowConfigForm(false);
      setEditingConfig(null);
    } catch (e: any) {
      throw e;
    } finally {
      setIsConfigSubmitting(false);
    }
  };

  const handleDeleteConfig = async (config: ProjectConfiguration) => {
    if (!companyId || !project || !canDelete) return;
    if (!confirm(`Delete configuration "${config.configuration_name}"? This will also affect associated inventory.`)) return;
    try {
      await projectConfigurationService.delete(companyId, config.id);
      toast.success("Configuration deleted");
      await loadSubData(project.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete configuration");
    }
  };

  // Inventory
  const openAddInventory = () => {
    if (!project || !canEdit || configs.length === 0) {
      if (configs.length === 0) toast.error("Add a configuration first");
      return;
    }
    setEditingInventory(null);
    setShowInventoryForm(true);
  };

  const openEditInventory = (inv: ProjectInventory) => {
    if (!canEdit) return;
    setEditingInventory(inv);
    setShowInventoryForm(true);
  };

  const handleInventorySubmit = async (data: any, id?: string) => {
    if (!companyId || !project) return;
    setIsInventorySubmitting(true);
    try {
      const payload = {
        ...data,
        project_id: project.id,
        configuration_id: data.configuration_id,
        available_units: data.available_units ? parseInt(data.available_units, 10) : 0,
        min_price: data.min_price ? parseFloat(data.min_price) : null,
        max_price: data.max_price ? parseFloat(data.max_price) : null,
      };
      if (id) {
        await projectInventoryService.update(companyId, id, payload);
        toast.success("Inventory updated");
      } else {
        await projectInventoryService.create(companyId, payload);
        toast.success("Inventory added");
      }
      await loadSubData(project.id);
      setShowInventoryForm(false);
      setEditingInventory(null);
    } catch (e: any) {
      throw e;
    } finally {
      setIsInventorySubmitting(false);
    }
  };

  const handleDeleteInventory = async (inv: ProjectInventory) => {
    if (!companyId || !project || !canDelete) return;
    if (!confirm("Delete this inventory record?")) return;
    try {
      await projectInventoryService.delete(companyId, inv.id);
      toast.success("Inventory deleted");
      await loadSubData(project.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete inventory");
    }
  };

  const closeManage = () => {
    closeAllSubForms();
    onOpenChange(false);
  };

  if (!project) return null;

  const filteredInventoriesForConfig = (configId: string) =>
    inventories.filter((i) => i.configuration_id === configId);

  return (
    <>
      <Modal open={open} onOpenChange={closeManage}>
        <div className="space-y-6 max-h-[85vh] overflow-auto pr-1">
          <div>
            <h3 className="text-lg font-semibold">Manage Project</h3>
            <p className="text-sm text-muted-foreground">{project.project_name}</p>
          </div>

          {/* Section 1: Project Details */}
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Project Details</div>
                <div className="font-medium text-lg">{project.project_name}</div>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={handleEditProject}>
                  Edit Details
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-muted-foreground">Developer:</span> {project.developer_name ?? "—"}</div>
              <div><span className="text-muted-foreground">Location:</span> {project.location ?? "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> {project.status}</div>
              <div><span className="text-muted-foreground">Possession:</span> {project.possession_date ? new Date(project.possession_date).toLocaleDateString("en-IN") : "—"}</div>
            </div>
          </div>

          {/* Section 2: Configurations */}
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Configurations</div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={openAddConfig}>
                  Add Configuration
                </Button>
              )}
            </div>

            {isLoadingSubs ? (
              <Skeleton className="h-10 w-full" />
            ) : configs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No configurations yet.</div>
            ) : (
              <div className="space-y-2">
                {configs.map((config) => (
                  <div key={config.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div>
                      <div className="font-medium">{config.configuration_name}</div>
                      <div className="text-muted-foreground text-xs">
                        Carpet: {config.carpet_area ?? "—"} | Saleable: {config.saleable_area ?? "—"} | Base Price: {config.starting_price != null ? new Intl.NumberFormat("en-IN").format(config.starting_price) : "—"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button variant="outline" size="sm" onClick={() => openEditConfig(config)}>
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteConfig(config)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Inventory */}
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Inventory (per configuration)</div>
              {canEdit && configs.length > 0 && (
                <Button variant="outline" size="sm" onClick={openAddInventory}>
                  Add Inventory
                </Button>
              )}
            </div>

            {isLoadingSubs ? (
              <Skeleton className="h-10 w-full" />
            ) : inventories.length === 0 ? (
              <div className="text-sm text-muted-foreground">No inventory records yet.</div>
            ) : (
              <div className="space-y-2">
                {configs.map((config) => {
                  const invs = filteredInventoriesForConfig(config.id);
                  if (invs.length === 0) return null;
                  return (
                    <div key={config.id} className="rounded-lg border border-border p-3">
                      <div className="font-medium text-sm mb-2">{config.configuration_name}</div>
                      {invs.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between text-sm py-1 border-t first:border-t-0">
                          <div>
                            Available: <span className="font-medium">{inv.available_units}</span>
                            {inv.min_price != null && ` • Min: ${new Intl.NumberFormat("en-IN").format(inv.min_price)}`}
                            {inv.max_price != null && ` • Max: ${new Intl.NumberFormat("en-IN").format(inv.max_price)}`}
                            {" • "}
                            <span className="capitalize">{inv.inventory_status.replace("_", " ")}</span>
                          </div>
                          <div className="flex gap-2">
                            {canEdit && (
                              <Button variant="outline" size="sm" onClick={() => openEditInventory(inv)}>
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteInventory(inv)}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            {configs.length === 0 && (
              <div className="text-xs text-muted-foreground">Add configurations before adding inventory.</div>
            )}
          </div>
        </div>
      </Modal>

      {/* Sub modals */}
      <Modal open={showProjectForm} onOpenChange={(o) => { if (!o) { setShowProjectForm(false); setEditingProject(null); } }}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Edit Project</h3>
          <ProjectForm
            project={editingProject || undefined}
            onSubmit={handleProjectSubmit}
            onCancel={() => { setShowProjectForm(false); setEditingProject(null); }}
            isSubmitting={isProjectSubmitting}
          />
        </div>
      </Modal>

      <Modal open={showConfigForm} onOpenChange={(o) => { if (!o) { setShowConfigForm(false); setEditingConfig(null); } }}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{editingConfig ? "Edit" : "Add"} Configuration</h3>
          <ConfigForm
            projectId={project.id}
            config={editingConfig || undefined}
            onSubmit={handleConfigSubmit}
            onCancel={() => { setShowConfigForm(false); setEditingConfig(null); }}
            isSubmitting={isConfigSubmitting}
          />
        </div>
      </Modal>

      <Modal open={showInventoryForm} onOpenChange={(o) => { if (!o) { setShowInventoryForm(false); setEditingInventory(null); } }}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{editingInventory ? "Edit" : "Add"} Inventory</h3>
          <InventoryForm
            projectId={project.id}
            configurations={configs}
            inventory={editingInventory || undefined}
            onSubmit={handleInventorySubmit}
            onCancel={() => { setShowInventoryForm(false); setEditingInventory(null); }}
            isSubmitting={isInventorySubmitting}
          />
        </div>
      </Modal>
    </>
  );
}
