"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { leadService } from "@/services/leads";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { serializeCSV, downloadCSV } from "@/lib/csv/csv-parser";
import type { LeadListItem } from "@/types/lead";

// Human-readable CSV headers — no UUID fields exported.
const LEAD_EXPORT_HEADERS = [
  "Lead Name",
  "Phone",
  "Email",
  "Source",
  "Status",
  "Assigned To",
  "Budget",
  "Location",
  "Requirement",
  "Remarks",
  "Created Date",
  "Last Updated",
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function leadToRow(lead: LeadListItem): (string | number | null)[] {
  return [
    lead.full_name,
    lead.phone,
    lead.email ?? "",
    lead.source_name,
    lead.status_name,
    lead.assigned_user_name ?? "",
    lead.budget ?? "",
    lead.location ?? "",
    lead.requirement ?? "",
    lead.remarks ?? "",
    formatDate(lead.created_at),
    formatDate(lead.updated_at),
  ];
}

const PAGE_SIZE = 1000;
const MAX_ROWS = 5000;

export function LeadCsvExportButton() {
  const user = useUser();
  const { can } = usePermissions();
  const [isExporting, setIsExporting] = useState(false);

  // Respects 3C: leadService.list() applies resolveLeadScope internally
  // Sales Executive must NOT have CSV export access per business rules
  if (!can("leads", "view") || user?.role === "sales_executive") return null;

  const handleExport = async () => {
    if (!user?.company_id) return;
    setIsExporting(true);

    try {
      const allLeads: LeadListItem[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const { data, error } = await leadService.list(
          user.company_id,
          {},
          currentPage,
          PAGE_SIZE,
        );

        if (error || !data) {
          toast.error(error?.message ?? "Failed to fetch leads for export");
          return;
        }

        allLeads.push(...data.data);
        totalPages = data.totalPages;
        currentPage++;

        // Safety cap
        if (allLeads.length >= MAX_ROWS) {
          toast.warning(`Export capped at ${MAX_ROWS} rows. Use filters to export a narrower set.`);
          break;
        }
      } while (currentPage <= totalPages);

      if (allLeads.length === 0) {
        toast.info("No leads to export.");
        return;
      }

      const rows = [LEAD_EXPORT_HEADERS, ...allLeads.map(leadToRow)];
      const csv = serializeCSV(rows);
      const filename = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(filename, csv);

      toast.success(`Exported ${allLeads.length} lead${allLeads.length !== 1 ? "s" : ""}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      id="lead-export-csv-btn"
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">
        {isExporting ? "Exporting…" : "Export CSV"}
      </span>
      <span className="sm:hidden">{isExporting ? "…" : "Export"}</span>
    </Button>
  );
}
