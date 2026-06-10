import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";

type ProjectsTableProps = {
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

export function ProjectsTable({
  projects,
  onEdit,
  onDelete,
  onManage,
  canEdit,
  canDelete,
}: ProjectsTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <th className="px-4 py-3 font-medium text-muted-foreground">Project</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Developer</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Possession</th>
            <th className="px-4 py-3 font-medium text-muted-foreground w-48">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No projects yet.
              </td>
            </tr>
          ) : (
            projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3 font-medium">{project.project_name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {project.developer_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {project.location ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={project.status === "active" ? "default" : "secondary"}
                  >
                    {project.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(project.possession_date)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
