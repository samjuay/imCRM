"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLead } from "@/hooks/use-lead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadErrorState } from "@/features/leads/components/lead-error-state";
import { LeadNotesTab } from "@/features/leads/components/lead-notes-tab";
import { LeadOverviewTab } from "@/features/leads/components/lead-overview-tab";
import { LeadActivityTimelineTab } from "@/features/leads/components/lead-status-update-tab";
import {
  LeadDetailTabs,
  type LeadDetailTabId,
} from "@/features/leads/components/lead-detail-tabs";
import { LeadQuickActions } from "@/features/leads/components/lead-quick-actions";
import { LeadPhoneLink } from "@/features/leads/components/lead-phone-link";

type LeadDetailProps = {
  leadId: string;
};

export function LeadDetail({ leadId }: LeadDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LeadDetailTabId>("overview");
  const {
    lead,
    notes,
    statusUpdates,
    siteVisits,
    projects,
    isLoading,
    error,
    refresh,
  } = useLead(leadId, { loadCompanyUsers: false });

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/leads");
    }
  };

  const leadOpenTotalRef = useRef<{ leadId: string; startedAt: number } | null>(
    null,
  );

  useEffect(() => {
    leadOpenTotalRef.current = { leadId, startedAt: performance.now() };
    console.log('[PERF] LeadDetail mounted, starting timing');

    return () => {
      if (leadOpenTotalRef.current?.leadId === leadId) {
        leadOpenTotalRef.current = null;
      }
    };
  }, [leadId]);

  useEffect(() => {
    const timing = leadOpenTotalRef.current;
    if (!isLoading && lead?.id === leadId && timing?.leadId === leadId) {
      const total = performance.now() - timing.startedAt;
      console.log(
        `[PERF] LEAD_OPEN_TOTAL_${leadId}: ${total.toFixed(2)}ms (rendered)`,
      );
      leadOpenTotalRef.current = null;
    }
  }, [isLoading, lead, leadId]);

  // Show cached lead summary immediately while loading full details
  const isInitialLoad = isLoading && !lead;

  if (isInitialLoad) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
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
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-primary md:text-2xl">
            {lead.full_name}
          </h1>
          <LeadPhoneLink
            phone={lead.phone}
            className="text-sm text-muted-foreground hover:underline"
          />
        </div>
      </div>

      <LeadQuickActions lead={lead} />

      <LeadDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        {activeTab === "overview" && (
          <LeadOverviewTab
            lead={lead}
            projects={projects}
            statusUpdates={statusUpdates}
            siteVisits={siteVisits}
          />
        )}
        {activeTab === "notes" && (
          <LeadNotesTab
            leadId={leadId}
            notes={notes}
            onAdded={() => void refresh()}
          />
        )}
        {activeTab === "activity-timeline" && lead && (
          <LeadActivityTimelineTab
            leadId={leadId}
            lead={lead}
            statusUpdates={statusUpdates}
            projects={projects}
            onUpdated={() => void refresh()}
          />
        )}
      </div>
    </div>
  );
}
