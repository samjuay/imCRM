import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Fresh: "bg-blue-100 text-blue-800 border-blue-200",
  Contacted: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Follow Up": "bg-amber-100 text-amber-800 border-amber-200",
  "Site Visit Planned": "bg-purple-100 text-purple-800 border-purple-200",
  "Site Visit Done": "bg-violet-100 text-violet-800 border-violet-200",
  Interested: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Booked: "bg-gold/20 text-gold-foreground border-gold/40",
  Lost: "bg-red-100 text-red-800 border-red-200",
  "Not Interested": "bg-slate-100 text-slate-600 border-slate-200",
};

type LeadStatusBadgeProps = {
  statusName: string;
};

export function LeadStatusBadge({ statusName }: LeadStatusBadgeProps) {
  const colorClass = STATUS_COLORS[statusName] ?? "bg-secondary text-secondary-foreground";

  return (
    <Badge variant="outline" className={cn("font-medium", colorClass)}>
      {statusName}
    </Badge>
  );
}