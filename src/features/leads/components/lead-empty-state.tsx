import { Inbox } from "lucide-react";

type LeadEmptyStateProps = {
  title?: string;
  description?: string;
};

export function LeadEmptyState({
  title = "No leads found",
  description = "Try adjusting your search or filters, or create a new lead.",
}: LeadEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <Inbox className="mb-3 size-10 text-muted-foreground" />
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}