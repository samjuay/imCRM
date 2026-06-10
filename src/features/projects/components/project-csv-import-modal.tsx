"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { useProjectStore } from "@/store/project-store";
import { projectService } from "@/services/projects/project.service";
import {
  parseCSV,
  csvRowsToObjects,
  serializeCSV,
  downloadCSV,
} from "@/lib/csv/csv-parser";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import type { ProjectStatus } from "@/types/project";

// ---------------------------------------------------------------------------
// Sample CSV
// ---------------------------------------------------------------------------

const SAMPLE_HEADERS = [
  "project_name",
  "developer_name",
  "location",
  "city",
  "state",
  "project_type",
  "status",
  "launch_date",
  "possession_date",
  "description",
];

const SAMPLE_DATA = [
  [
    "Sunrise Heights",
    "ABC Developers",
    "Andheri West",
    "Mumbai",
    "Maharashtra",
    "Residential",
    "active",
    "2025-01-01",
    "2027-06-30",
    "Luxury 2/3 BHK",
  ],
  [
    "Green Valleys",
    "XYZ Builders",
    "Hinjewadi",
    "Pune",
    "Maharashtra",
    "Villa",
    "active",
    "",
    "2028-03-31",
    "",
  ],
];

function downloadSample() {
  const rows = [SAMPLE_HEADERS, ...SAMPLE_DATA];
  downloadCSV("project_import_sample.csv", serializeCSV(rows));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowStatus = "valid" | "warning" | "error";

type ParsedProjectRow = {
  rowNum: number;
  raw: Record<string, string>;
  project_name: string;
  developer_name: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  project_type: string | null;
  status: ProjectStatus;
  launch_date: string | null;
  possession_date: string | null;
  description: string | null;
  rowStatus: RowStatus;
  errors: string[];
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_STATUSES: ProjectStatus[] = ["active", "inactive"];

function isISODate(val: string): boolean {
  if (!val) return true; // optional
  return /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val));
}

function validateProjectRows(
  rawRows: Record<string, string>[],
  existingProjectNames: string[],
): ParsedProjectRow[] {
  const existingNamesLower = new Set(existingProjectNames.map((n) => n.toLowerCase()));

  return rawRows.map((raw, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];
    const warnings: string[] = [];

    const project_name = (raw["project_name"] ?? "").trim();
    if (!project_name) errors.push("project_name is required");

    const statusRaw = (raw["status"] ?? "").trim().toLowerCase() as ProjectStatus;
    const status: ProjectStatus = VALID_STATUSES.includes(statusRaw)
      ? statusRaw
      : "active";
    if (raw["status"] && !VALID_STATUSES.includes(statusRaw)) {
      warnings.push(`status "${raw["status"]}" is unknown; defaulting to "active"`);
    }

    const launch_date = raw["launch_date"]?.trim() || null;
    if (launch_date && !isISODate(launch_date)) {
      errors.push(`launch_date "${launch_date}" must be YYYY-MM-DD`);
    }

    const possession_date = raw["possession_date"]?.trim() || null;
    if (possession_date && !isISODate(possession_date)) {
      errors.push(`possession_date "${possession_date}" must be YYYY-MM-DD`);
    }

    // Soft duplicate warning
    if (project_name && existingNamesLower.has(project_name.toLowerCase())) {
      warnings.push(`project "${project_name}" already exists (will be created as a new record)`);
    }

    let rowStatus: RowStatus = "valid";
    if (errors.length > 0) rowStatus = "error";
    else if (warnings.length > 0) rowStatus = "warning";

    return {
      rowNum,
      raw,
      project_name,
      developer_name: raw["developer_name"]?.trim() || null,
      location: raw["location"]?.trim() || null,
      city: raw["city"]?.trim() || null,
      state: raw["state"]?.trim() || null,
      project_type: raw["project_type"]?.trim() || null,
      status,
      launch_date,
      possession_date,
      description: raw["description"]?.trim() || null,
      rowStatus,
      errors,
      warnings,
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "upload" | "validate" | "import" | "done";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

const BATCH_SIZE = 50;

export function ProjectCsvImportModal({ open, onOpenChange, onImported }: Props) {
  const user = useUser();
  const { can } = usePermissions();
  const { projects, reset: resetStore, loadByCompany } = useProjectStore();

  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedProjectRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  // Only Company Admin and super_admin can import projects
  if (!can("projects", "create") || user?.role === "team_leader" || user?.role === "sales_executive") return null;

  const companyId = user?.company_id;

  const validRows = rows.filter((r) => r.rowStatus === "valid" || r.rowStatus === "warning");
  const errorRows = rows.filter((r) => r.rowStatus === "error");
  const warningRows = rows.filter((r) => r.rowStatus === "warning");

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setStep("upload");
      setFileName("");
      setRows([]);
      setImportProgress(0);
      setImportedCount(0);
    }
    onOpenChange(o);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsValidating(true);
    setStep("validate");

    const text = await file.text();
    const allRows = parseCSV(text);
    const objects = csvRowsToObjects(allRows);

    const existingNames = projects.map((p) => p.project_name);
    const parsed = validateProjectRows(objects, existingNames);

    setRows(parsed);
    setIsValidating(false);

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownloadErrors = () => {
    if (errorRows.length === 0) return;
    const headers = ["row", "project_name", "errors"];
    const data = errorRows.map((r) => [
      String(r.rowNum),
      r.project_name || r.raw["project_name"] || "",
      r.errors.join("; "),
    ]);
    downloadCSV("project_import_errors.csv", serializeCSV([headers, ...data]));
  };

  const handleImport = async () => {
    if (!companyId) return;

    const toImport = validRows;
    if (toImport.length === 0) return;

    setStep("import");
    setImportProgress(0);

    let imported = 0;

    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      const batch = toImport.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (row) => {
          const { error } = await projectService.create(companyId, {
            project_name: row.project_name,
            developer_name: row.developer_name,
            location: row.location,
            city: row.city,
            state: row.state,
            project_type: row.project_type,
            status: row.status,
            launch_date: row.launch_date,
            possession_date: row.possession_date,
            description: row.description,
          });
          if (!error) imported++;
        }),
      );
      setImportProgress(Math.round(((i + batch.length) / toImport.length) * 100));
    }

    setImportedCount(imported);
    setStep("done");

    if (imported > 0) {
      toast.success(`${imported} project${imported !== 1 ? "s" : ""} imported successfully`);
      // Refresh project store (reset cache so loadByCompany fetches fresh data)
      resetStore();
      await loadByCompany(companyId);
      onImported();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const renderUploadStep = () => (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Import Projects from CSV</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Required column:{" "}
          <code className="text-xs bg-muted px-1 rounded">project_name</code>.
          Optional:{" "}
          <code className="text-xs bg-muted px-1 rounded">developer_name</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">location</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">status</code>, and more.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="project-csv-file-input"
          className="flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <Upload className="size-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground text-center">
            {fileName ? fileName : "Click to choose a .csv file"}
          </span>
          <input
            ref={fileRef}
            id="project-csv-file-input"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <div className="flex justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={downloadSample}
          id="project-csv-download-sample-btn"
        >
          <Download className="size-4" />
          Download Sample CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderValidateStep = () => {
    if (isValidating) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Validating…</h3>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary animate-pulse w-1/2 rounded-full" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">Validation Results</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Reviewed <strong>{rows.length}</strong> row{rows.length !== 1 ? "s" : ""} from{" "}
            <em>{fileName}</em>
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Ready</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-amber-500">{warningRows.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Warnings</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{errorRows.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Errors</div>
          </div>
        </div>

        {/* Issues table */}
        {(errorRows.length > 0 || warningRows.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Issues</span>
              {errorRows.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleDownloadErrors}>
                  <Download className="size-3.5" />
                  Error Report
                </Button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border text-sm">
              <table className="w-full">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">Row</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Project</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {[...errorRows, ...warningRows].map((r) => (
                    <tr key={r.rowNum} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">{r.rowNum}</td>
                      <td className="px-3 py-1.5">{r.project_name || "—"}</td>
                      <td
                        className={`px-3 py-1.5 text-xs ${
                          r.rowStatus === "error"
                            ? "text-destructive"
                            : "text-amber-600"
                        }`}
                      >
                        {[...r.errors, ...r.warnings].join(" • ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-between flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStep("upload");
              setRows([]);
              setFileName("");
            }}
          >
            Choose Different File
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              disabled={validRows.length === 0}
              onClick={handleImport}
              id="project-csv-import-confirm-btn"
            >
              Import {validRows.length} Row{validRows.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderImportStep = () => (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Importing…</h3>
      <p className="text-sm text-muted-foreground">
        Please wait while projects are being created.
      </p>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{importProgress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${importProgress}%` }}
          />
        </div>
      </div>
    </div>
  );

  const renderDoneStep = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {importedCount > 0 ? (
          <CheckCircle2 className="size-8 text-green-500 shrink-0" />
        ) : (
          <XCircle className="size-8 text-destructive shrink-0" />
        )}
        <div>
          <h3 className="text-lg font-semibold">Import Complete</h3>
          <p className="text-sm text-muted-foreground">
            {importedCount} project{importedCount !== 1 ? "s" : ""} imported successfully.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="gold" size="sm" onClick={() => handleOpenChange(false)}>
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
        {step === "upload" && renderUploadStep()}
        {step === "validate" && renderValidateStep()}
        {step === "import" && renderImportStep()}
        {step === "done" && renderDoneStep()}
      </div>
    </Modal>
  );
}
