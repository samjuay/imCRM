"use client";

import { Download } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { useProjectStore } from "@/store/project-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { serializeCSV, downloadCSV } from "@/lib/csv/csv-parser";
import type { Project } from "@/types/project";

// Human-readable headers only — no UUID fields
const PROJECT_EXPORT_HEADERS = [
  "Project Name",
  "Developer",
  "Location",
  "City",
  "State",
  "Project Type",
  "Status",
  "Launch Date",
  "Possession Date",
  "Description",
  "Created Date",
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function projectToRow(p: Project): (string | null)[] {
  return [
    p.project_name,
    p.developer_name ?? "",
    p.location ?? "",
    p.city ?? "",
    p.state ?? "",
    p.project_type ?? "",
    p.status,
    formatDate(p.launch_date),
    formatDate(p.possession_date),
    p.description ?? "",
    formatDate(p.created_at),
  ];
}

export function ProjectCsvExportButton() {
  const user = useUser();
  const { can } = usePermissions();
  const { projects } = useProjectStore();

  // Only Company Admin and super_admin can export projects
  if (!can("projects", "view") || user?.role === "team_leader" || user?.role === "sales_executive") return null;

  const handleExport = () => {
    if (projects.length === 0) {
      toast.info("No projects to export.");
      return;
    }

    const rows = [PROJECT_EXPORT_HEADERS, ...projects.map(projectToRow)];
    const csv = serializeCSV(rows);
    const filename = `projects_export_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(filename, csv);
    toast.success(`Exported ${projects.length} project${projects.length !== 1 ? "s" : ""}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      id="project-export-csv-btn"
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">Export CSV</span>
      <span className="sm:hidden">Export</span>
    </Button>
  );
}
