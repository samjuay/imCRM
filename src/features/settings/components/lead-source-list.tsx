"use client";

import { Edit, Archive } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface LeadSource {
  id: string;
  source_name: string;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
}

interface LeadSourceListProps {
  sources: LeadSource[];
  onEdit: (source: LeadSource) => void;
  onArchive: (source: { id: string; source_name: string }) => void;
}

export function LeadSourceList({ sources, onEdit, onArchive }: LeadSourceListProps) {
  const { can } = usePermissions();

  const canEdit = can("lead_sources", "edit");

  const activeSources = sources.filter((s) => !s.archived_at);
  const archivedSources = sources.filter((s) => s.archived_at);

  const allSources = [...activeSources, ...archivedSources];

  if (allSources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No lead sources found.</p>
        <p className="text-sm mt-1">Click &quot;Add Source&quot; to create your first lead source.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <tr className="border-b border-border">
            <th className="px-4 py-3 font-medium text-muted-foreground">Source Name</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
            <th className="px-4 py-3 font-medium text-muted-foreground w-32">Actions</th>
          </tr>
        </TableHeader>
        <TableBody>
          {allSources.map((source) => (
            <TableRow key={source.id} className={source.archived_at ? "opacity-50" : ""}>
              <TableCell className="px-4 py-3 font-medium">{source.source_name}</TableCell>
              <TableCell className="px-4 py-3">
                <Badge variant={source.archived_at ? "secondary" : "default"}>
                  {source.archived_at ? "Archived" : source.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">
                {formatDate(source.created_at)}
              </TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {!source.archived_at && can("lead_sources", "edit") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(source)}
                      className="h-8 w-8"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {!source.archived_at && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onArchive({ id: source.id, source_name: source.source_name })}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  {source.archived_at && (
                    <span className="text-xs text-muted-foreground">Archived</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}