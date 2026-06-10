"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";

type ProjectsCardListProps = {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onManage: (project: Project) => void;
  canEdit: boolean;
  canDelete: boolean;
};

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProjectsCardList({
  projects,
  onEdit,
  onDelete,
  onManage,
  canEdit,
  canDelete,
}: ProjectsCardListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          No projects yet.
        </div>
      ) : (
        projects.map((project) => (
          <div
            key={project.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{project.project_name}</div>
                <div className="text-sm text-muted-foreground">
                  {project.developer_name ?? "—"}
                </div>
              </div>
              <Badge
                variant={project.status === "active" ? "default" : "secondary"}
              >
                {project.status}
              </Badge>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div className="text-muted-foreground">
                Location: {project.location ?? "—"}
              </div>
              <div className="text-muted-foreground">
                Possession: {formatDate(project.possession_date)}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManage(project)}
              >
                Manage
              </Button>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(project)}
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(project)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
