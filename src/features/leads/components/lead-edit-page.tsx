"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLead } from "@/hooks/use-lead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadErrorState } from "@/features/leads/components/lead-error-state";
import { LeadForm } from "@/features/leads/components/lead-form";

type LeadEditPageProps = {
  leadId: string;
};

export function LeadEditPage({ leadId }: LeadEditPageProps) {
  const { lead, companyUsers, isLoading, error, refresh } = useLead(leadId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <LeadErrorState
        message={error ?? "Lead not found"}
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/leads/${leadId}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-primary md:text-2xl">
            Edit Lead
          </h1>
          <p className="text-sm text-muted-foreground">{lead.full_name}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        <LeadForm mode="edit" lead={lead} companyUsers={companyUsers} />
      </div>
    </div>
  );
}