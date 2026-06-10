"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { useMasterData } from "@/hooks/use-master-data";
import { leadService } from "@/services/leads";
import { userService } from "@/services/user.service";
import { filterCompanyUsersForScope } from "@/lib/auth/lead-scope";
import { parseCSV, csvRowsToObjects, normalizePhone, serializeCSV, downloadCSV } from "@/lib/csv/csv-parser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import type { CompanyUser } from "@/types/lead";
import type { UserProfile } from "@/types/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowStatus = "valid" | "duplicate_phone" | "intra_file_duplicate" | "error";

type ParsedRow = {
  rowNum: number;
  raw: Record<string, string>;
  // Resolved fields
  full_name: string;
  phone: string;
  email: string | null;
  lead_source_id: string | null;
  status_id: string | null;
  assigned_user_id: string | null;
  budget: number | null;
  location: string | null;
  requirement: string | null;
  remarks: string | null;
  // Validation
  status: RowStatus;
  errors: string[];
};

// ---------------------------------------------------------------------------
// Sample CSV
// ---------------------------------------------------------------------------

const SAMPLE_HEADERS = [
  "full_name",
  "phone",
  "email",
  "source_name",
  "status_name",
  "assigned_to",
  "budget",
  "location",
  "requirement",
  "remarks",
];

const SAMPLE_DATA = [
  [
    "Rahul Sharma",
    "9876543210",
    "rahul@example.com",
    "Website",
    "Fresh",
    "",
    "2500000",
    "Mumbai",
    "2BHK",
    "Interested in sea-facing units",
  ],
  [
    "Priya Mehta",
    "9123456780",
    "",
    "Referral",
    "Contacted",
    "",
    "",
    "Pune",
    "3BHK",
    "",
  ],
];

function downloadSample() {
  const rows = [SAMPLE_HEADERS, ...SAMPLE_DATA];
  downloadCSV("lead_import_sample.csv", serializeCSV(rows));
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function resolveUser(
  value: string,
  assignableUsers: CompanyUser[],
): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const match = assignableUsers.find(
    (u) =>
      u.full_name.toLowerCase() === v ||
      u.email.toLowerCase() === v,
  );
  return match?.id ?? null;
}

function validateRows(
  rawRows: Record<string, string>[],
  profile: UserProfile,
  assignableUsers: CompanyUser[],
  leadSources: { id: string; source_name: string; is_active: boolean }[],
  leadStatuses: { id: string; status_name: string; is_active: boolean }[],
  defaultAssigneeId: string | null,
): ParsedRow[] {
  const seenPhones = new Map<string, number>(); // normalised phone → first rowNum

  return rawRows.map((raw, idx) => {
    const rowNum = idx + 2; // +2 because row 1 is header
    const errors: string[] = [];

    // full_name
    const full_name = raw["full_name"] ?? "";
    if (!full_name) errors.push("full_name is required");

    // phone
    const rawPhone = raw["phone"] ?? "";
    const phone = normalizePhone(rawPhone);
    if (!phone || phone.length < 10) {
      errors.push("phone must be at least 10 digits");
    }

    // email
    const email = raw["email"] || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("email is invalid");
    }

    // source
    const sourceName = (raw["source_name"] ?? "").trim().toLowerCase();
    const source = leadSources.find(
      (s) => s.is_active && s.source_name.toLowerCase() === sourceName,
    );
    if (!source) errors.push(`source_name "${raw["source_name"] ?? ""}" not found or inactive`);

    // status
    const statusName = (raw["status_name"] ?? "").trim().toLowerCase();
    const status = leadStatuses.find(
      (s) => s.is_active && s.status_name.toLowerCase() === statusName,
    );
    if (!status) errors.push(`status_name "${raw["status_name"] ?? ""}" not found or inactive`);

    // assigned_to → resolve with default fallback
    let assigned_user_id: string | null = null;
    const assignedToRaw = (raw["assigned_to"] ?? "").trim();
    if (assignedToRaw) {
      assigned_user_id = resolveUser(assignedToRaw, assignableUsers);
      if (!assigned_user_id) {
        errors.push(`assigned_to "${assignedToRaw}" not found or not in your scope`);
      }
    } else {
      // Use default assignee
      if (defaultAssigneeId) {
        assigned_user_id = defaultAssigneeId;
      } else {
        errors.push("assigned_to is empty and no Default Assignee is selected");
      }
    }

    // budget
    const budgetRaw = raw["budget"] ?? "";
    let budget: number | null = null;
    if (budgetRaw) {
      const parsed = parseFloat(budgetRaw.replace(/,/g, ""));
      if (isNaN(parsed)) errors.push("budget must be a number");
      else budget = parsed;
    }

    // location / requirement / remarks
    const location = raw["location"] || null;
    const requirement = raw["requirement"] || null;
    const remarks = raw["remarks"] || null;

    // Intra-file duplicate detection
    let rowStatus: RowStatus = errors.length > 0 ? "error" : "valid";
    if (rowStatus === "valid" && phone.length >= 10) {
      if (seenPhones.has(phone)) {
        rowStatus = "intra_file_duplicate";
        errors.push(`duplicate phone in this file (first seen on row ${seenPhones.get(phone)})`);
      } else {
        seenPhones.set(phone, rowNum);
      }
    }

    return {
      rowNum,
      raw,
      full_name,
      phone,
      email,
      lead_source_id: source?.id ?? null,
      status_id: status?.id ?? null,
      assigned_user_id,
      budget,
      location,
      requirement,
      remarks,
      status: rowStatus,
      errors,
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

export function LeadCsvImportModal({ open, onOpenChange, onImported }: Props) {
  const user = useUser();
  const { can } = usePermissions();
  const { leadSources, leadStatuses } = useMasterData();

  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<CompanyUser[]>([]);
  const [defaultAssigneeId, setDefaultAssigneeId] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const profile = user as UserProfile | null;
  const companyId = user?.company_id;
  const canCreate = can("leads", "create");

  // Sales Executive must NOT have CSV import access per business rules
  const canImport = canCreate && user?.role !== "sales_executive";

  const validRows = rows.filter((r) => r.status === "valid");
  const duplicateRows = rows.filter(
    (r) => r.status === "duplicate_phone" || r.status === "intra_file_duplicate",
  );
  const errorRows = rows.filter((r) => r.status === "error");

  // Load assignable users when modal opens or when profile/companyId changes
  const ensureUsers = useCallback(async () => {
    if (!companyId || !profile) return;
    setIsLoadingUsers(true);
    try {
      const { data } = await userService.getByCompany(companyId);
      if (data) {
        const scoped = filterCompanyUsersForScope(profile, data, "assign");
        setAssignableUsers(scoped);
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [companyId, profile]);

  // Load users when modal opens
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      // Reset all state on close
      setStep("upload");
      setFileName("");
      setRows([]);
      setDefaultAssigneeId("");
      setImportProgress(0);
      setImportedCount(0);
    } else {
      void ensureUsers();
    }
    onOpenChange(o);
  };

  // Also load users when profile/companyId becomes available (handles race conditions)
  useEffect(() => {
    if (open && companyId && profile) {
      void ensureUsers();
    }
  }, [open, companyId, profile, ensureUsers]);

  if (!canImport) return null;

  // Step 1 — File selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setFileName(file.name);
    setIsValidating(true);
    setStep("validate");

    const text = await file.text();
    const allRows = parseCSV(text);
    const objects = csvRowsToObjects(allRows);

    // Run client-side validation (no DB calls yet)
    const parsed = validateRows(
      objects,
      profile,
      assignableUsers,
      leadSources,
      leadStatuses,
      defaultAssigneeId || null,
    );

    // DB duplicate phone check (only for syntactically valid rows with unique phones)
    const phoneCandidates = parsed.filter((r) => r.status === "valid");
    const checkedRows = await Promise.all(
      phoneCandidates.map(async (r) => {
        if (!companyId) return r;
        const { exists } = await leadService.checkDuplicatePhone(companyId, r.phone);
        if (exists) {
          return { ...r, status: "duplicate_phone" as RowStatus, errors: [...r.errors, "Phone already exists in the system"] };
        }
        return r;
      }),
    );

    // Merge checked rows back
    const finalRows = parsed.map((r) => {
      if (r.status !== "valid") return r;
      return checkedRows.find((c) => c.rowNum === r.rowNum) ?? r;
    });

    setRows(finalRows);
    setIsValidating(false);

    // Clear input so same file can be re-selected after changes
    if (fileRef.current) fileRef.current.value = "";
  };

  // Re-validate when default assignee changes (step 2)
  const handleDefaultAssigneeChange = async (userId: string) => {
    setDefaultAssigneeId(userId);
    if (!profile || rows.length === 0) return;

    // Re-run client-side validation only (no new DB calls for phone — already done)
    const rawObjects = rows.map((r) => r.raw);
    const reParsed = validateRows(
      rawObjects,
      profile,
      assignableUsers,
      leadSources,
      leadStatuses,
      userId || null,
    );

    // Merge existing DB duplicate flags back in
    const merged = reParsed.map((r) => {
      const prev = rows.find((p) => p.rowNum === r.rowNum);
      if (prev?.status === "duplicate_phone") {
        return { ...r, status: "duplicate_phone" as RowStatus, errors: [...r.errors, "Phone already exists in the system"] };
      }
      return r;
    });

    setRows(merged);
  };

  // Download error report
  const handleDownloadErrors = () => {
    const erroredRows = rows.filter((r) => r.status !== "valid");
    if (erroredRows.length === 0) return;
    const headers = ["row", "full_name", "phone", "errors"];
    const data = erroredRows.map((r) => [
      String(r.rowNum),
      r.full_name || r.raw["full_name"] || "",
      r.raw["phone"] || "",
      r.errors.join("; "),
    ]);
    downloadCSV("lead_import_errors.csv", serializeCSV([headers, ...data]));
  };

  // Step 3 — Import
  const handleImport = async () => {
    if (!companyId || !user?.user_id) return;

    const toImport = validRows;
    if (toImport.length === 0) return;

    setStep("import");
    setImportProgress(0);

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      const batch = toImport.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (row) => {
          const { error } = await leadService.create(companyId, {
            full_name: row.full_name,
            phone: row.phone,
            email: row.email,
            lead_source_id: row.lead_source_id!,
            status_id: row.status_id!,
            assigned_user_id: row.assigned_user_id,
            budget: row.budget,
            location: row.location,
            requirement: row.requirement,
            remarks: row.remarks,
            created_by: user.user_id,
          });
          if (error) {
            failed++;
          } else {
            imported++;
          }
        }),
      );
      setImportProgress(Math.round(((i + batch.length) / toImport.length) * 100));
    }

    setImportedCount(imported);
    setStep("done");

    if (imported > 0) {
      toast.success(`${imported} lead${imported !== 1 ? "s" : ""} imported successfully`);
      onImported();
    }
    if (failed > 0) {
      toast.error(`${failed} row${failed !== 1 ? "s" : ""} failed during import`);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const renderUploadStep = () => (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Import Leads from CSV</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV file to bulk-create leads. Required columns:{" "}
          <code className="text-xs bg-muted px-1 rounded">full_name</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">phone</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">source_name</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">status_name</code>.
        </p>
      </div>

      {/* Default Assignee */}
      <div className="space-y-2">
        <Label htmlFor="default-assignee-upload">
          Default Assignee{" "}
          <span className="text-muted-foreground text-xs font-normal">
            (used when assigned_to column is blank)
          </span>
        </Label>
        <Select
          id="default-assignee-upload"
          value={defaultAssigneeId}
          onChange={(e) => setDefaultAssigneeId(e.target.value)}
          disabled={isLoadingUsers}
        >
          <option value="">
            {isLoadingUsers ? "Loading users…" : "— Select default assignee —"}
          </option>
          {!isLoadingUsers &&
            assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
        </Select>
        {isLoadingUsers && (
          <p className="text-xs text-muted-foreground">Fetching assignable users…</p>
        )}
      </div>

      {/* File picker */}
      <div className="space-y-2">
        <Label>CSV File</Label>
        <label
          htmlFor="lead-csv-file-input"
          className="flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <Upload className="size-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground text-center">
            {fileName ? fileName : "Click to choose a .csv file"}
          </span>
          <input
            ref={fileRef}
            id="lead-csv-file-input"
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
          id="lead-csv-download-sample-btn"
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
          <p className="text-sm text-muted-foreground">Checking for duplicates and errors…</p>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary animate-pulse w-1/2 rounded-full" />
          </div>
        </div>
      );
    }

    const totalRows = rows.length;

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">Validation Results</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Reviewed <strong>{totalRows}</strong> row{totalRows !== 1 ? "s" : ""} from{" "}
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
            <div className="text-2xl font-bold text-amber-500">{duplicateRows.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Duplicates</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{errorRows.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Errors</div>
          </div>
        </div>

        {/* Default assignee (can still change here) */}
        <div className="space-y-2">
          <Label htmlFor="default-assignee-validate">
            Default Assignee{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (applied to rows with no assigned_to value)
            </span>
          </Label>
          <Select
            id="default-assignee-validate"
            value={defaultAssigneeId}
            onChange={(e) => void handleDefaultAssigneeChange(e.target.value)}
            disabled={isLoadingUsers}
          >
            <option value="">
              {isLoadingUsers ? "Loading users…" : "— Select default assignee —"}
            </option>
            {!isLoadingUsers &&
              assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
          </Select>
          {isLoadingUsers && (
            <p className="text-xs text-muted-foreground">Fetching assignable users…</p>
          )}
        </div>

        {/* Error table */}
        {(errorRows.length > 0 || duplicateRows.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Issues</span>
              <Button variant="ghost" size="sm" onClick={handleDownloadErrors}>
                <Download className="size-3.5" />
                Error Report
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border text-sm">
              <table className="w-full">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">Row</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {[...errorRows, ...duplicateRows].map((r) => (
                    <tr key={r.rowNum} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">{r.rowNum}</td>
                      <td className="px-3 py-1.5">{r.full_name || r.raw["full_name"] || "—"}</td>
                      <td className="px-3 py-1.5 text-destructive text-xs">{r.errors.join(" • ")}</td>
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
              id="lead-csv-import-confirm-btn"
            >
              Import {validRows.length} Valid Row{validRows.length !== 1 ? "s" : ""}
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
        Please wait while leads are being created.
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
            {importedCount} lead{importedCount !== 1 ? "s" : ""} imported successfully.
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

  if (!canCreate) return null;

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
