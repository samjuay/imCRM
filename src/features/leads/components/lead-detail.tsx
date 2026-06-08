"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLead } from "@/hooks/use-lead";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { leadService } from "@/services/leads";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { LeadErrorState } from "@/features/leads/components/lead-error-state";
import { LeadFollowupsTab } from "@/features/leads/components/lead-followups-tab";
import { LeadNotesTab } from "@/features/leads/components/lead-notes-tab";
import { LeadOverviewTab } from "@/features/leads/components/lead-overview-tab";
import { LeadSiteVisitsTab } from "@/features/leads/components/lead-site-visits-tab";
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
  const [activeTab, setActiveTab] = useState<LeadDetailTabId>("overview");
  const user = useUser();
  const { can } = usePermissions();
  const {
    lead,
    notes,
    followups,
    siteVisits,
    projects,
    isLoading,
    error,
    refresh,
  } = useLead(leadId);

  const handleStatusChange = async (statusId: string) => {
    if (!user?.company_id || !lead || !can("leads", "edit")) return;

    const { error: updateError } = await leadService.update(
      user.company_id,
      lead.id,
      { status_id: statusId },
    );

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success("Status updated");
    void refresh();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
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
          <Link href="/leads">
            <ArrowLeft className="size-4" />
          </Link>
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

      <LeadQuickActions
        lead={lead}
        onStatusChange={(statusId) => void handleStatusChange(statusId)}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      <LeadDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        {activeTab === "overview" && <LeadOverviewTab lead={lead} />}
        {activeTab === "notes" && (
          <LeadNotesTab
            leadId={leadId}
            notes={notes}
            onAdded={() => void refresh()}
          />
        )}
        {activeTab === "followups" && (
          <LeadFollowupsTab
            leadId={leadId}
            followups={followups}
            onAdded={() => void refresh()}
            onUpdated={() => void refresh()}
          />
        )}
        {activeTab === "site-visits" && (
          <LeadSiteVisitsTab
            leadId={leadId}
            siteVisits={siteVisits}
            projects={projects}
            onAdded={() => void refresh()}
            onUpdated={() => void refresh()}
          />
        )}
      </div>
    </div>
  );
}